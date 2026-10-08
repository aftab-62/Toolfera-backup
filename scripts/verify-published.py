"""Compare an authorized published Site with its locally tested artifact.

JSON input: origin, token, checkout, output. Authentication stays in memory.
Run with a TTY to hide input; nothing from credentials is written to the report.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import sys
import termios
import urllib.error
import urllib.request
from urllib.parse import urlsplit


def read_input():
    saved = None
    if sys.stdin.isatty():
        saved = termios.tcgetattr(sys.stdin.fileno())
        hidden = saved.copy()
        hidden[3] &= ~termios.ECHO
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, hidden)
    try:
        print('Ready for authenticated published-build audit JSON on stdin (input is hidden).', flush=True)
        return json.loads(sys.stdin.readline())
    finally:
        if saved is not None:
            termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, saved)


settings = read_input()
origin = settings['origin'].rstrip('/')
checkout = Path(settings['checkout'])
headers = {'OAI-Sites-Authorization': 'Bearer ' + settings['token'], 'Cache-Control': 'no-cache'}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # Never forward the private authorization header to another host.


opener = urllib.request.build_opener(NoRedirect)


def request(path):
    try:
        with opener.open(urllib.request.Request(origin + path, headers=headers), timeout=30) as response:
            return response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, error.read(), dict(error.headers)


home_status, home_bytes, _ = request('/')
home = home_bytes.decode('utf-8', errors='replace')
if home_status != 200 or 'id="motion-preference"' not in home:
    raise SystemExit('Published homepage did not return the current authenticated Tool Fera HTML.')

client = checkout / 'dist/client'
local_assets = sorted(p for p in (client / '_next/static').rglob('*') if p.suffix in ('.js', '.css'))


def verify_asset(path):
    route = '/' + path.relative_to(client).as_posix()
    status, body, response_headers = request(route)
    expected = hashlib.sha256(path.read_bytes()).hexdigest()
    actual = hashlib.sha256(body).hexdigest()
    return {'path': route, 'status': status, 'bytes': len(body), 'sha256': actual,
            'matchesTestedBuild': status == 200 and expected == actual,
            'cacheControl': response_headers.get('Cache-Control', response_headers.get('cache-control'))}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    assets = list(pool.map(verify_asset, local_assets))

sitemap_status, sitemap_bytes, _ = request('/sitemap.xml')
robots_status, robots_bytes, _ = request('/robots.txt')
sitemap = sitemap_bytes.decode('utf-8', errors='replace')
robots = robots_bytes.decode('utf-8', errors='replace')
routes = sorted(set(urlsplit(url).path for url in re.findall(r'<loc>([^<]+)</loc>', sitemap)
                    if url.startswith(origin + '/')))


def verify_route(route):
    status, body, _ = request(route)
    html = body.decode('utf-8', errors='replace')
    canonical = re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"', html)
    return {'path': route, 'status': status, 'h1Count': len(re.findall(r'<h1(?:\s|>)', html)),
            'canonical': canonical.group(1) if canonical else None,
            'currentMotionSettingRendered': 'id="motion-preference"' in html}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    pages = list(pool.map(verify_route, routes))
missing_routes = []
for route in ['/does-not-exist/', '/pdf-tools/does-not-exist/', '/__qa/responsive.html']:
    status, body, _ = request(route)
    missing_routes.append({'path': route, 'status': status, 'noindex': 'noindex' in body.decode('utf-8', errors='replace')})

result = {'origin': origin, 'homepageStatus': home_status,
          'assetCount': len(assets), 'assets': assets,
          'sitemapStatus': sitemap_status, 'sitemapUrls': len(routes), 'robotsStatus': robots_status,
          'robotsReferencesCurrentSitemap': origin + '/sitemap.xml' in robots,
          'sitemapPages': pages, 'missingRoutes': missing_routes,
          'passed': all(a['matchesTestedBuild'] for a in assets)
                    and sitemap_status == 200 and robots_status == 200
                    and origin + '/sitemap.xml' in robots and bool(routes)
                    and all(p['status'] == 200 and p['h1Count'] == 1
                            and p['canonical'] == origin + p['path']
                            and p['currentMotionSettingRendered'] for p in pages)
                    and all(p['status'] == 404 and p['noindex'] for p in missing_routes)}
Path(settings['output']).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: result[key] for key in ['origin', 'assetCount', 'sitemapUrls', 'sitemapStatus', 'robotsStatus', 'passed']}, indent=2))
if not result['passed']:
    sys.exit(1)

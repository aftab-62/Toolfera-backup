# Tool Fera domain and search measurement checklist

Status: prepared on 8 October 2026. No domain migration, ownership verification, analytics installation or search submission was performed in this phase.

## Current URL authority

The published Site uses `https://utilityhub.maftab7806.chatgpt.site`. The future intended origin is `https://toolfera.xyz`; it is not configured as this Site's production origin. Current self-canonicals, Open Graph URLs, breadcrumbs, app/article schema and sitemap use the current origin. `lib/seo.tsx` is the shared origin setting (`SITE_URL`, with the current origin as its default). Content links use relative paths.

## Coordinated migration, when the domain is ready

1. Configure and verify the custom domain and HTTPS with the actual chosen host. Do not change canonical URLs before the destination works.
2. Set `SITE_URL=https://toolfera.xyz` in the target deployment's environment and build/redeploy that **same source**. On Sites, use its environment configuration; on Vercel use the deployment environment. Confirm that the runtime also receives the setting where required.
3. Serve the existing paths unchanged. Redirect the old origin to the same new path with a permanent redirect where the old host supports it. Do not send every old URL to the homepage. If that host cannot redirect, record the limitation instead of pretending a redirect exists.
4. Choose one public hostname. Redirect `www` and other variants to the selected HTTPS origin where DNS/hosting permits. Do not invent redirects for infrastructure you do not control.
5. Fetch the homepage, a tool, a category and an article. Check title, self-canonical, OG URL, breadcrumbs, JSON-LD and HTTPS assets all use the new origin. Check `/robots.txt` and `/sitemap.xml` together. Rerun `node scripts/audit-seo.mjs` against a built Worker with the same `SITE_URL`; this script is a local HTTP/SSR audit, not a Lighthouse run.
6. Do not retain the old origin as the canonical on the new domain. Do not invent new last-modified dates for unchanged content. Keep article publication dates accurate.

## Google Search Console

- Create a property for the actual live origin. A DNS-verified Domain property is suitable for a domain you control; use the official available verification method for the current hosted origin if supported.
- Submit the canonical `/sitemap.xml` after origin checks pass. Confirm Google can fetch it and that it lists only indexable pages.
- Inspect representative homepage/category/tool/article URLs. Compare the declared canonical with the crawler-selected canonical and review rendered content and page-indexing reasons.
- Monitor indexed pages, errors and excluded URLs before judging traffic. A submitted sitemap and valid schema do not guarantee indexing.
- After an eligible whole-domain move, use the official migration/change-of-address workflow where available. Keep both properties for transition monitoring.

## Bing Webmaster Tools

Verify the live property using a supported ownership method, submit the same canonical sitemap, inspect crawl/index status and review errors. Do not install an IndexNow key or send notifications until the host and ownership configuration are intentionally set up.

## Measurement without invented results

After indexing, record query impressions, clicks, CTR and position trends from the actual search properties. Compare comparable periods and inspect intent, not only head-term positions. Search Console average position is aggregated data, not proof of a fixed rank. Separate branded and non-branded traffic and record domain-migration dates.

No traffic, ranking, impressions, clicks, keyword volumes, authority scores, Lighthouse scores or field Core Web Vitals were measured in this content phase. Analytics/tracking was not added. Lighthouse or real-user performance data must be collected separately in a genuinely usable environment.

## Content priorities after data exists

Improve pages with real impressions and mismatched intent; review tool capability copy when a limit or output changes; add supporting guides where users have an unanswered task. Validate new articles with examples, useful links and a specific purpose. Do not mass-create country/device/keyword variants or promise guaranteed rankings. Maintain source references and genuine publication/update dates.

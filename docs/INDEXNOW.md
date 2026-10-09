# IndexNow notifications

The supplied public verification file is `public/8feeca25cbf24334a032d888e2c9461e.txt`. Vercel serves it at:

https://toolfera.xyz/8feeca25cbf24334a032d888e2c9461e.txt

This verification key is intentionally public. No secret, dependency or environment variable is required.

Run the script explicitly **after a successful production release**, only for genuinely added or updated indexable URLs:

```sh
pnpm run indexnow https://toolfera.xyz/changed-page/ https://toolfera.xyz/blog/changed-guide/
```

Use actual changed canonical URLs. The script verifies the live key and requires active URLs to appear in the live production sitemap. It never automatically submits the whole sitemap. It does not run during builds, deployments, page views or tool processing.

For a genuinely deleted, formerly indexable URL, retain its old canonical URL and submit it separately:

```sh
pnpm run indexnow --deleted https://toolfera.xyz/blog/removed-guide/
```

The deletion flag bypasses current sitemap membership because a removed URL should no longer be listed there. The caller must confirm it was previously indexable and is genuinely removed. It does not delete site content.

Preview the payload without making any network requests:

```sh
pnpm run indexnow --dry-run https://toolfera.xyz/changed-page/
```

Only HTTPS apex-domain canonical URLs with trailing slashes are accepted. Queries, fragments, credentials, preview/old domains and known non-indexable technical/contact paths are rejected. Duplicate URLs are removed. One POST is made to `https://api.indexnow.org/indexnow`, with no automatic retries; at most 10,000 explicit URLs are allowed. Dry-run checks local key/URL format only; live sitemap verification occurs on actual submission.

HTTP 200 means the notification was received successfully. HTTP 202 means it was received while key validation is pending. Other HTTP responses are reported as failures. A transport timeout does not establish whether the server received the request; inspect before considering another submission.

Notification acceptance does **not** prove indexing or ranking. The sitemap remains the full-site discovery mechanism. Google Search Console and Bing Webmaster Tools remain separate and unchanged.

Protocol references: [IndexNow documentation](https://www.indexnow.org/documentation) and [FAQ](https://www.indexnow.org/faq).

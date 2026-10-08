# Tool Fera

React + TypeScript utility platform using the Next-style App Router on Vinext/Vite, published with Sites/Cloudflare Workers. The current catalog contains 46 working tools and seven categories. Files/text are processed on-device; there is no application login, paid API, ads, payment system or user database.

## Run locally

Use Node.js 22 and pnpm 11.25.0 (declared in package.json):

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Default development URL: **http://localhost:5173**. If the port is occupied, use the exact URL printed in the terminal. No application secrets are required for local utility tools.

```sh
pnpm exec tsc --noEmit --incremental false
pnpm build
pnpm start
```

The existing Sites production target is a Cloudflare Worker, not a plain static export. The existing Sites hosting identity is in `.openai/hosting.json`. The original `dev`, `build` and `start` scripts retain that workflow. Future custom-domain configuration is centralized in `lib/seo.tsx`; `toolfera.xyz` has not been migrated.

## Native Next.js / Vercel

The same application also has a native Next.js build path. `vercel.json` selects it without changing the Sites/Cloudflare configuration. Browser workers use the shared `new Worker(new URL(..., import.meta.url))` form supported by both Vite and Webpack. Worker algorithms and same-origin engine assets are unchanged.

Use Node.js **24.x** on Vercel (the repository requires at least 22.13.0). Enable Corepack with the Vercel environment variable **`ENABLE_EXPERIMENTAL_COREPACK=1`** so installation honors the existing **pnpm 11.25.0** pin and lockfile.

| Vercel New Project setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `./` (repository root) |
| Build Command | `pnpm run build:vercel` |
| Output Directory | Leave override OFF; Next.js manages `.next` |
| Install Command | `pnpm install --frozen-lockfile` |
| Environment Variables | `ENABLE_EXPERIMENTAL_COREPACK=1` |

No application credentials, database bindings or paid processing services are required. Do **not** set `SITE_URL` to a preview hostname or `toolfera.xyz` yet: the current canonical/sitemap/schema origin remains the existing published Sites origin. Domain migration is a separate step after a temporary Vercel deployment is tested.

To run the Vercel-compatible path locally after the same dependency installation:

```sh
pnpm dev:vercel
# http://localhost:3000

pnpm exec tsc --noEmit --incremental false
pnpm build:vercel
pnpm start:vercel
# http://localhost:3000
```

Keep the entire `public/` directory, including PDF.js workers/CMaps/fonts/WASM, OCR workers/core/language data and DOCX fonts. Vercel serves these at their existing absolute paths; Next.js emits application workers under `/_next/static/`. Do not use the Cloudflare `dist/` directory as the Vercel output, and do not add an SPA fallback rewrite.

## Source structure

- `app/`: server-rendered homepage, category/tool/resource routes, recovery page, layout/styles and existing sitemap/robots.
- `components/site/`: navigation, search, cards, layouts, localStorage favorites/history, uploads, action/download animations and tool interfaces.
- `components/ui/`: shared primitives; only used primitives are included in Tailwind generation.
- `lib/tool-definitions.ts`: lightweight catalog and task search registry; `lib/catalog.ts` holds server-rendered content; `lib/tool-seo.ts` holds the preserved metadata configuration.
- `tools/`: browser processing engines, workers, validators, conversion parsers/renderers and calculations.
- `public/`: brand/hero assets, same-origin PDF.js/OCR workers, WASM/language data, conversion fonts and required licenses. Keep these engine files intact.
- `build/`, `vite.config.ts`, `scripts/`: Worker/build integration and verification helpers.

Tool UIs use route-level lazy imports. PDF/OCR/DOCX/QR engines load when relevant work is requested. The DOCX parser loads only after file selection. Native document navigation stays intact; supporting browsers may prefetch HTML on navigation intent. This does not prefetch processing engines.

PDF → Word uses native PDF text, editable Word body elements, recoverable tables and localized graphics; Word → PDF parses native DOCX structure. Neither invokes OCR. Scanned files use the separate English OCR tools. Exact document layout and recognition remain technically limited. No converter algorithm was changed in the performance pass.

UI fonts use the system stack. Conversion fonts are separate tool assets. The OS reduced-motion preference is respected without a user-selectable animation mode; normal animations and synchronized download timing remain.

## Verification

```sh
node --experimental-strip-types scripts/verify-tool-engines.mjs
node --experimental-strip-types scripts/verify-motion-reliability.mjs
node scripts/measure-client.mjs
```

The bundle script requires an existing production build. Its static dependency closure is not an observed transfer, Lighthouse score or field Core Web Vitals measurement. Historical document/render harnesses may require external regression fixtures and rendering dependencies. See current [QA.md](QA.md) for exact measured results, scope and limitations; historical reports do not substitute for current verification.

## Development and releases

Add a tool to the central registry/content system, implement its existing lazy interface/engine boundary, then verify it before marking it available. Favorites/history save only validated tool IDs in localStorage; inputs/files/passwords remain in page memory.

Do not commit `node_modules`, `dist`, caches, credentials, local execution profiles, private input files or temporary/debug outputs. The GitHub source release keeps required runtime assets and source/lock/config files; historical generated screenshots/logs/fixtures are excluded from that release. Existing historical reports remain preserved in the Sites source.

Dedicated competitive SEO, keyword strategy, tool-page content expansion, internal-link strategy and SEO blog/content work were intentionally deferred to the next dedicated SEO pass.

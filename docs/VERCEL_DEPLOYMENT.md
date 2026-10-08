# Tool Fera Vercel deployment compatibility — 8 October 2026

## Scope and release baseline

Repository: `aftab-62/Toolfera`, branch: `main`. Baseline commit: `af4cf80cfafad60394cc018d0ee45a15c5c12df5` (published Sites version 33).

This is a deployment compatibility change, not a new design/content/tool release. The published Sites site is not redeployed. No domain is connected. PDF-to-Word reconstruction, Word-to-PDF rendering, OCR algorithms, calculators, animations, routing and SEO content are unchanged.

## Why the original build could not be used on Vercel

The existing `build` script delegates to Vinext/Vite and its Cloudflare plugin. The generated `dist/server/wrangler.json` and Worker entry are intended for Wrangler/Cloudflare, not Vercel's native Next.js deployment adapter. Six client modules also imported worker URLs with Vite's `?worker&url` syntax. Native Next.js is already a locked dependency and the existing App Router source supports its server/static rendering model.

## Changes

- `package.json`: add `dev:vercel`, `build:vercel` and `start:vercel`. Existing Sites commands, dependencies, engine constraint and pnpm pin remain unchanged.
- `vercel.json`: select the native Next.js preset, `pnpm run build:vercel`, frozen-lockfile installation and native development command. No custom static output directory, rewrite fallback or Cloudflare adapter is used.
- `tools/image-client.ts`, `tools/pdf-client.ts`, `tools/word-client.ts`, `tools/word-pdf-client.ts`, `components/site/text-tools.tsx`, `components/site/transform-tool.tsx`: replace only Vite-specific URL imports/worker constructors with statically analyzable `new Worker(new URL(..., import.meta.url), {type: 'module'})`. Existing messages, algorithms, lazy calls, cancellation, error handling and cleanup remain unchanged.
- `README.md`: document both deployment paths and exact Vercel settings.
- `QA.md` and `docs/QA.md`: identical targeted verification appendix. This document records the deployment checks separately from prior SEO/functionality evidence.

`next.config.ts`, `vite.config.ts`, `.openai/hosting.json`, Cloudflare integration, Wrangler commands, Sites scripts, pnpm lockfile and public assets are preserved. No dependencies were added. D1 and R2 are null in the existing hosting configuration; the application requires neither. Native Next.js server traces contain no Vinext, Cloudflare plugin, Wrangler, workerd or Sites worker/environment runtime file.

## Installation and build — verified

Environment used: Node.js 24.19.0, pnpm 11.25.0, Next.js 16.3.4, TypeScript 5.9.3.

- `pnpm install --frozen-lockfile --offline`: passed from the existing package store; 636 packages installed, zero downloaded, lockfile unchanged. This verifies the lockfile/install policy against the available packages, not a cold install on Vercel infrastructure.
- pnpm configuration with every `SITES_*` environment variable removed: resolves its project-local store fallback correctly.
- `pnpm exec tsc --noEmit --incremental false`: passed.
- One native production build, `pnpm run build:vercel` (`next build --webpack`): passed, including Next.js TypeScript validation and static generation of 79 entries. These include technical/error/metadata entries; the intended indexable inventory remains **74**, not 79.
- All 74 sitemap paths are present in the native prerender manifest and returned HTTP 200 with the expected canonical origin and one H1 during the production HTTP audit. All 14 new article source files remain present; the existing privacy guide is also retained.

Webpack is selected explicitly for its standard worker-entry bundling. Both native development and production use that same bundler. Vercel consumes Next.js output in `.next` through its Next.js preset; it must not serve the old Cloudflare `dist/` output as a static site.

## Native production route checks — verified HTTP/rendered HTML

The production server was started locally with `next start`, checked, and stopped. Representative pages returned 200; the tool pages contained their controls in rendered HTML:

- Homepage.
- PDF Compressor, PDF to Word, Word to PDF, PNG/JPG to PDF.
- Image Compressor and Image to Text OCR.
- Percentage Calculator, JSON Formatter and QR Code Generator.
- PDF category, article index, PDF compression guide, native-editable-PDF guide and JSON guide.
- About, Contact and Privacy Policy.

Four unknown destinations (unknown page, PDF tool, article and nested path) returned **404** with `noindex`. Three tested slashless category/tool/article URLs returned **308** redirects to trailing-slash URLs. Sitemap and robots were served successfully. Existing canonical/sitemap origin remained `https://utilityhub.maftab7806.chatgpt.site`.

These checks do not claim browser clicks, visual rendering, physical-phone tests, download completion or converter output fidelity.

## Assets and worker checks — verified with stated scope

- All **222 public files** returned 200 and byte-matched their source files. This includes logo/hero assets, PDF.js worker, CMaps, standard fonts, WASM, OCR worker/core/language data and DOCX fonts.
- WASM responses used `application/wasm`; tested JavaScript/module assets used JavaScript MIME types.
- All **79 emitted JavaScript files** were served from valid `/_next/static/` URLs and byte-matched build output. Both generated CSS assets were also served with `text/css` and matching bytes; that production server check ran with all `SITES_*` variables removed.
- Targeted Vite compilation of the six changed client modules emitted all five distinct worker types: image, PDF, DOCX, Word-to-PDF and text. The original Sites build configuration was not modified; a full new Cloudflare release build was not performed.
- Seven native worker entries (including duplicate text entry points) initialized in a **Node VM** and loaded their emitted dependency chunks through the generated `/_next/static/` paths. Limited messages passed for JSON formatting, PDF page inspection and DOCX ZIP reading. The image worker correctly returned its existing compatibility guidance because the VM has no browser canvas. This is not a browser Worker/canvas/OCR quality test.
- Captured native production server logs contained startup information and no application runtime error during HTTP checks. Browser console/hydration behavior on an actual Vercel deployment remains unverified.

## Tool/performance/SEO safety

Final source comparison is against the current GitHub baseline. Apart from the six worker URL adapters, no processing source was changed. Worker source/algorithms, PDF-to-Word paragraph/table/graphic writers, Word-to-PDF parser/renderer, OCR, calculator formulas, public assets, tool catalog, article sources, SEO origin/configuration, header, hero/search animation and route definitions match the baseline.

Heavy engines retain their existing lazy import/request boundaries. No PDF/OCR/DOCX engine import was added to the homepage shell. No new package, animation system, server processing service, database or authentication requirement was introduced. Native Next.js has its own framework output; no new Lighthouse, bundle-performance percentage, phone timing or field Core Web Vitals claim is made.

## Exact Vercel New Project settings

| Setting | Value |
| --- | --- |
| Framework Preset | **Next.js** |
| Root Directory | **`./`** (repository root) |
| Build Command | **`pnpm run build:vercel`** |
| Output Directory | **Override OFF** (Next.js-managed `.next`) |
| Install Command | **`pnpm install --frozen-lockfile`** |
| Environment Variables | **`ENABLE_EXPERIMENTAL_COREPACK=1`** |
| Node.js Version | **24.x** |

Corepack must be enabled so Vercel honors `packageManager: pnpm@11.25.0`; its default lockfile detection alone does not pin that version. No application secret is required. Do not set `SITE_URL` to `toolfera.xyz` or a temporary Vercel hostname during this compatibility task.

Official references: [Vercel build/Corepack settings](https://vercel.com/docs/builds/configure-a-build), [Vercel package managers](https://vercel.com/docs/package-managers), [Next.js CLI / Webpack build option](https://nextjs.org/docs/app/api-reference/cli/next).

## Remaining deployment acceptance

No Vercel project was created and no deployment/domain connection was attempted. The actual Vercel build image, cold dependency download, deployment adapter execution, CDN/browser worker behavior, mobile lifecycle, canvas conversion, OCR/WASM execution and native saved-file completion require the first temporary `.vercel.app` deployment and its browser/device checks. Do not change canonicals or connect `toolfera.xyz` until that deployment is stable and the separate migration is authorized.

No Lighthouse or physical-phone performance result is claimed. Converter-quality QA was not repeated because conversion algorithms were unchanged. Published Sites version 33 remains the baseline; this repository adds the independent deployment path.

# Tool Fera — static header and background visual pass

4 October 2026. Baseline: saved/published v22, source `8050eb2293fe4186b0747b1e46695677e25dea5d`. Scope: the newly attached visual instructions only. No full-platform QA was repeated. The native final deployment receipt establishes the published version and outcome.

## Implemented

1. **Header network removed:** deleted `components/site/header-network.tsx` and `components/site/header-network-engine.ts`; removed their import/mount from `header.tsx` and all `.header-atmosphere`/`.header-network` styling. No hidden canvas layer remains. Network RAF, clock, liveness/resize recovery, pointer/touch listeners, observers and opt-in debug logic are deleted. The obsolete `scripts/verify-header-network.mjs` and `scripts/create-header-browser-fixture.mjs` were also removed. Historical evidence is retained under docs.
2. **Static header:** 112-degree gradient `#12213c → #182f58 → #223d70`, with very soft `#365ba955` and `#4775ac18` radial highlights. Scrolling keeps the same background and dimensions; only the existing shadow/border treatment changes. No background animation, bottom strip, canvas or image is used.
3. **Navigation:** near-white labels `#edf3ff`, white selected/open states, pale arrows `#c6d9f4`, translucent blue active surfaces and pale cyan `#b6e9f5` focus outlines. Desktop dropdowns remain light with dark text. Mobile sheet behavior, selected states, tap feedback, search behavior and all handlers are unchanged. Existing 65px mobile / 74px larger header geometry, CSS breakpoints and immediate SSR desktop navigation are retained.
4. **Logo:** recognizable TF path geometry retained. Static SVG surface `#294678 → #142544`, a 1.5-unit inset edge at 30% opacity, small top reflection at 38%, white T, cobalt F `#5685ff` and cyan detail `#73d8ee`. React `useId` gives each SVG paint a unique SSR ID. Wordmark typography/dimensions are unchanged; the header wordmark is `#f5f8ff` with `#c3e4ff` accent.
5. **Logo depth/glow:** header SVG uses a one-pixel translucent edge, 4px/10px restrained dark shadow and 12px cyan glow `#65cbe41c`. Mobile reduces these to 2px/6px shadow and 8px glow `#65cbe414`. No animation, large blur, new asset or logo size increase.
6. **Page gradients:** cool near-white body base, light cobalt/cyan/lavender hero washes, soft popular/trust washes, distinct pale-blue/cyan category backdrop, light page-header washes shared by tool/category/About pages, light FAQ transition. Existing student and generator accent areas receive restrained navy/blue depth while retaining their layout and text colors. No homepage copy or structure changed.
7. **Cards/panels:** ordinary cards use `#ffffffed` with `#dce6f4` borders and a very soft shadow; selected existing featured/image cards retain gentle tinted surfaces. Tool workspaces remain opaque white. Inputs, upload zones, progress and result logic/styling are unchanged. Existing hover movement is retained, not expanded into glass/blur effects.
8. **Footer:** selected the light option, `#f2f6fc → #eaf2fc → #eef8fb`, with soft blue/indigo radial washes, darker `#506581` supporting/link text and a subtle `#d2e0f1` separator. Footer structure, links and spacing are unchanged.

Main runtime files: `components/site/header.tsx`, `components/site/logo.tsx`, `app/globals.css`; the two network files were deleted. No dependency/package/lockfile change.

## Actually completed checks

- `scripts/verify-header.mjs`: actual React SSR on three paths, five repeated renders each; seven initial navigation triggers; no header canvas/decorative layer; active route preserved; unique header/footer SVG paint IDs. Authored CSS cascade/state checks at **320, 360, 375, 390, 430, 768, 1024, 1040, 1041, 1280, 1440px** confirm static gradients, breakpoint controls, fixed dimensions across scroll state, mobile press/open/focus styling and light controls. This is source/CSS verification, not browser layout measurement.
- Conservative authored color contrast bounds: navigation **7.72:1**, active navigation **6.23:1**, header controls **6.51:1**, wordmark accent **6.49:1**, footer links **5.29:1**, main text **13.53:1**, supporting page text **4.60:1**. These calculations use a conservative combined maximum of header radial overlays; they are not sampled browser screenshots or a full accessibility audit.
- TypeScript passed: `tsc --noEmit --incremental false --pretty false`.
- Exactly **one** production build passed via the Sites build helper.
- `scripts/verify-header-production.mjs`: seven production Worker requests passed: desktop/mobile homepage, PDF Compressor, Image Resizer, Percentage Calculator, JSON Formatter and About. Each returned 200 with header/footer, blocking stylesheets and no header canvas. Home SSR header matches across desktop/mobile agents, including deliberately delayed stream consumption. Header dependency assets returned 200 and contain no removed network runtime/debug markers. **Zero Worker errors/warnings**. This check does not execute browser JavaScript or operate tools.
- `git diff --check` passed. Source diff confirms converters, OCR, tool logic, routes, SEO, search, navigation implementation, validation, download behavior and homepage content were not modified.
- One managed-preview attempt returned `ERR_CONNECTION_REFUSED` in the actual cloud browser. It was stopped; no repeated recovery, separate server, new public fixture route or watcher was left running.

## Measured payload impact

Actual v22 and new production files, gzipSync defaults:

| Area | v22 raw / gzip bytes | Static candidate raw / gzip bytes | Change |
|---|---:|---:|---:|
| Header JS chunk | 16,886 / 6,361 | 9,605 / 3,414 | −7,281 raw / −2,947 gzip |
| Header static JS dependency closure | 424,655 / 131,747 | 417,374 / 128,798 | −7,281 raw / −2,949 gzip |

Across all production CSS files, gzip size increased by **751 bytes**. Combined measured header JS closure plus CSS shrank by **2,198 gzip bytes**. Header-network drawing/listener/timer work is eliminated by source removal. No phone CPU/FPS, load-time, Lighthouse or Core Web Vitals improvement was measured or promised.

## Verification limits

At packaging time the updated design's actual browser screenshots, mobile overflow, physical-phone appearance, interactive dropdown/search/tap behavior, browser hydration/console, slow reload paint and CLS remain unverified because preview refused the connection. Source geometry and initial blocking CSS support stability but are not proof of zero browser layout shift. Any later published-site browser observation must be reported separately with its actual scope; it must not retroactively turn these source checks into phone results.

Evidence: `docs/qa/2026-10-04-static-gradients/source-checks.json`, `production-checks.json`, `bundle-comparison.json`. Previous network reports are historical and do not describe this static header. Existing hero/search/action animations are intentionally preserved.

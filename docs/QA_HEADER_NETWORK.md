# Tool Fera — header network animation

**Historical v20 background:** superseded by `QA_HEADER_MOTION_BACKGROUNDS.md`. Results below describe that earlier source and are not current mobile acceptance.

**4 October 2026 (UTC).** Continued saved v19 at `6b72890815a80cdcf930c103f33d15f16623cda5`. Runtime scope is only the decorative header background. Tools, converters, OCR, navigation markup/behavior, logo, routes, SEO, hero/search and action animations were not changed. No full-platform QA was repeated.

**Implemented and verified in native-canvas/lifecycle and production-HTTP harnesses. Interactive browser/physical-phone acceptance is unverified.**

## Implementation

1. **Technique:** an original Canvas 2D mesh replaces the two CSS dot/glow layers. Thin 0.65 px cobalt/cyan connections join small 1.2–1.65 px nodes. The same full-header decorative wrapper remains behind the existing foreground; its canvas is absolutely positioned, clipped and pointer-transparent. No bottom strip, Vanta, Three.js, WebGL, particle library or new package was added.
2. **Cursor:** passive pointer listeners on the header read cached canvas-relative coordinates. Nodes within 120 px receive an exponentially eased, bounded offset (at most 9 px horizontally / 6 px vertically). Connections follow those points and fade according to distance. Mouse movement does not measure layout or start the animation clock. Touch movement does not enable a mouse effect or stop idle animation.
3. **Mobile continuity:** `requestAnimationFrame` starts after the initial size/draw, independently of pointer/hover events. Autonomous sine-based drift continues while the page is visible and normal motion is enabled. Hidden pages pause and automatically resume; reduced-motion preference draws a static mesh without a frame loop, including when the existing root full-effects flag is present. Resize/temporary zero dimensions recover automatically.
4. **Density:** 8–12 nodes on mobile (up to 760 px), 14–18 on tablet (up to 1040 px), 20–28 on desktop. Tested counts are below.
5. **Performance/cleanup:** paint rate is capped at 30 on mobile / 60 on larger layouts, backing pixel ratio at 1.5. Each node checks at most three following neighbours, rather than all pairs. No React frame-state updates, per-frame layout reads, blur, shadows or external requests. ResizeObserver/window resize update geometry. Unmount cancels the pending frame, disconnects the observer, removes all header/window/document/media listeners and releases the canvas backing store to 1×1. A missing 2D context gracefully leaves the existing static background wash.

## Current tests actually performed

| Width (px) | Height used (px) | Nodes | Paint calls in two controlled seconds |
|---:|---:|---:|---:|
| 320 | 65 | 8 | 60 |
| 360 | 65 | 8 | 60 |
| 390 | 65 | 8 | 60 |
| 430 | 65 | 9 | 60 |
| 768 | 74 | 14 | 120 |
| 1040 | 74 | 18 | 120 |
| 1280 | 74 | 20 | 120 |
| 1440 | 74 | 22 | 120 |
| 1920 | 74 | 28 | 120 |

These counts use a **controlled 60 Hz scheduler and an installed native Canvas adapter**, not measured browser/device frame rates. The actual drawing/controller source was exercised. At each width, initial/one-second/two-second PNG hashes differ without any pointer input. There is exactly one pending frame and only one initial geometry read. Node coordinates remain within the tested header canvas. Native-canvas samples were visually inspected on the site's light background; they are not complete browser header screenshots.

Additional targeted checks passed:

- Native renderer comparison at identical clock times: local cursor response, far nodes unchanged, bounded movement and smooth decay. Maximum observed test displacement was **5.683 px**.
- Actual header pointer-handler path in the controlled environment: cached wrapper coordinates and passive listener verified, **6.677 px** maximum response, no pointer/frame layout reads; response decays after pointerleave.
- Initial reduced-motion static render; runtime normal → reduced → normal changes; hidden → visible pause/resume; zero-size recovery; resize without duplicate loops; ResizeObserver fallback; frame/listener cleanup; null-context fallback.
- All CSS outside the replaced background selectors was checked byte-for-byte against saved v19 and is unchanged.
- Actual React SSR and authored-CSS geometry/state checks passed at 320, 360, 375, 390, 430, 768, 1040, 1041, 1280 and 1440 px. Existing header geometry/navigation were retained. This is a CSS-state evaluator, not measured browser overflow/CLS.
- TypeScript passed: `tsc --noEmit --incremental false --pretty false`.
- Exactly **one** final production build passed through the Sites build helper.
- Built Worker HTTP/asset checks passed: repeated desktop/mobile home headers match; seven existing triggers and the new canvas are present; normal stylesheet links are in the initial head; old drift/glow and bottom-strip styles are absent; static header dependency assets return 200. Worker errors and warnings are empty.

The small five-request HTTP smoke check ran twice: a result-capture error occurred after its first successful completion, and the same check was repeated while recovering its output. No runtime edit or extra production build was needed. The saved evidence is the final passing run. No preview server, dev watcher or improvised browser automation was started; Worker emulators were disposed.

## Measured artifact sizes

| Artifact | v19 raw / gzip bytes | Network build raw / gzip bytes |
|---|---:|---:|
| Header chunk | 9,229 / 3,255 | 13,009 / 4,738 |
| Unique header static dependency files, summed | 416,998 / 128,640 | 420,778 / 130,126 |

Summed gzip growth is **1,486 bytes**. These are file measurements, including shared existing framework/search/icon code, not browser network totals or performance scores. No claim of unchanged measured mobile performance is made.

## Limits

The managed browser capability remains unavailable. Visible movement on an actual desktop/mobile browser, live mouse interaction, complete header readability, actual horizontal overflow/layout shift, browser console/hydration warnings and device frame rate were not directly observed. Native-canvas frame changes and controller tests establish implementation/lifecycle behavior; they do not certify physical-phone behavior. No Lighthouse/Core Web Vitals or native-browser performance comparison was performed. Reduced-motion users intentionally receive a static network, and hidden tabs intentionally stop painting.

Existing navigation/reload fixes from v19 remain unchanged. Its earlier CSS-background evidence is historical, superseded by this network-only report. Document-conversion evidence in root/docs QA is also preserved without rerunning or recertifying it. Native publication records the deployed source/build identity; it does not substitute for the unverified browser checks above.

## Files and evidence

Runtime: `components/site/header-network-engine.ts`, `components/site/header-network.tsx`, the decorative child/import in `components/site/header.tsx`, and background-only rules in `app/globals.css`.

Tests: `scripts/verify-header-network.mjs`; the two existing header harnesses were adapted to the new canvas. Fresh evidence is in `docs/qa/2026-10-04-header-network/` (`network-checks.json`, `header-css-checks.json`, `production-checks.json`, `before-bundle.json`). The private reference image stays outside source/deployment assets.

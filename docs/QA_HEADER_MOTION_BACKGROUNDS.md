# Tool Fera — header motion and background gradients

**Historical v21 candidate evidence:** the later real-phone recording confirms a mobile visual freeze. See `QA_HEADER_MESH_CANDIDATE.md` for the open regression, updated header source and verification/publication limits.

4 October 2026 (UTC). Targeted visual follow-up to saved/published **v20**, baseline commit `e9782d06e56e202dbc8a8bbf713fad96626e7d7f`. The next native publication receipt records the deployed version. This report supersedes the v20 network background acceptance evidence; earlier navigation and converter evidence is preserved, not rerun or recertified.

## Status and mobile cause

**Implemented; targeted renderer/lifecycle/production checks passed. Physical-phone/browser acceptance remains unverified.** The exact trigger of the reported freeze on the user's phone was **not reproduced or established**. It would be incorrect to say a physical mobile test passed.

Two concrete source failure paths were reproduced on the actual saved v20 engine with controlled DOM/rAF events:

1. Mounting with a zero-sized canvas clears the model and stops scheduling. Returning to a visible page, receiving `pageshow` or focus does not re-measure it. Only the host was observed, so the canvas could become sized without a host resize; no frame starts without a further resize event.
2. After injecting a discarded pending rAF callback, the engine retains its frame handle. `pageshow`/focus have no recovery listeners, and same-size resize returns early. It remains stopped. Discarding a frame is a controlled fault injection, **not evidence that this happened on the user's mobile browser**.

Fresh before-test evidence: `docs/qa/2026-10-04-header-motion-backgrounds/before-lifecycle.json`. No old QA pass claim was reused as current acceptance.

## Implementation

| Area | Change | Verification / limits |
|---|---|---|
| Motion lifecycle | Observe canvas and header; retry zero-size measurement every 250 ms while visible; same-size measurements still schedule. Explicit visibility, pagehide/pageshow, focus, orientation and resize recovery cancels stale handles and re-measures. | Both injected failure cases now recover; zero-size recovery needs no external resize event. Visibility and page restoration, orientation, same-size focus, observer fallback and cleanup passed in controlled tests. |
| Lost frame recovery | One lightweight 1-second liveness timer while visible and motion enabled; if the last delivered frame is older than 900 ms, cancel/re-measure/restart. No layout reads on healthy ticks. | Injected silent frame loss automatically recovers. Hidden/pagehide and reduced-motion states stop normal animation/timers; unmount cancels frames/timers/observers/listeners. Not a guarantee that every browser/device delivers smooth frames. |
| Network style | Sparse flowing chain with occasional longer branches, curved connections, independently fading depth levels, small node halos and selected travelling cyan pulses. Cobalt/cyan/soft indigo palette; no bottom strip. | Actual Canvas pixels at 0/2/5 seconds differ at all nine requested widths; native-render contact sheet inspected. Header logo/navigation GUI readability still needs browser review. |
| Cursor/touch | Passive wrapper pointer events; eased local displacement, small local glow, no strong repulsion. Touch influence expires after 650 ms and eases away; touch never starts the autonomous clock. Decorative layer remains pointer-events:none. | Actual pointer-handler coordinates and leave recovery passed; maximum measured pointer-event displacement 6.958 px. Controlled touch displacement 6.577 px, expiry/decay and cleanup passed. No real touch gesture test. |
| Reduced motion | OS prefers-reduced-motion gets one static network render; reverting it resumes autonomously. Mobile width alone never disables motion. | Initial reduced-motion, preference transitions and static pixel hashes tested. |
| Website gradients | CSS-only near-white/ivory base, pale cobalt/cyan/blue-violet washes on body, hero, category/bento background, shared page headers (tools/categories/About), FAQ transition, footer and translucent light category cards. Existing dark generator card and image card remain unchanged. | Original stylesheet is an exact prefix of the new stylesheet; appended rules change only backgrounds. No padding, dimensions, layout, text color or unrelated animation changes. Five page types serve the compiled styles in production. Full browser contrast/visual review is unavailable. |
| Scope | Runtime changes confined to `components/site/header-network-engine.ts` and appended background rules in `app/globals.css`. | Tools/converters/OCR/SEO/routes/search/download/upload/navigation structure and other runtime files untouched. |

## Motion speed and density

These are actual source parameters, not measured device frame rates. Motion uses elapsed time; paint targets remain 30 Hz on widths up to 760 px and 60 Hz above that, capped device pixel ratio **1.5**.

| Parameter | Saved v20 | Updated mobile | Updated desktop/tablet |
|---|---:|---:|---:|
| Main horizontal angular rate (rad/s) | 0.37 | 0.53 (+43%) | 0.58 (+57%) |
| Secondary horizontal angular rate (rad/s) | 0.19 | 0.27 | 0.30 |
| Vertical angular rate (rad/s) | 0.51 | 0.70 (+37%) | 0.76 (+49%) |
| Main horizontal drift amplitude (px) | 5.5 mobile / 8 desktop | 7 | 9 |
| Vertical amplitude (px) | 4.5 | 5.5 | 5.5 |
| Pointer easing rate | 9 | 12 | 12 |
| Travelling pulse cycle (s) | None | 5.8 | 5.2 |

| Width (px) | Old nodes | New nodes | Actual paint calls over simulated 5 s |
|---:|---:|---:|---:|
| 320 | 8 | 8 | 150 |
| 360 | 8 | 8 | 150 |
| 375 | 8 | 8 | 150 |
| 390 | 8 | 8 | 150 |
| 430 | 9 | 8 | 150 |
| 768 | 14 | 12 | 300 |
| 1024 | 18 | 14 | 300 |
| 1280 | 20 | 18 | 300 |
| 1440 | 22 | 19 | 300 |

Mobile caps 8–10 nodes, tablet 12–16, desktop 18–24. Connections are prepared at resize, bounded to a chain plus one branch per five nodes; no all-pairs search, heavy library, WebGL, per-frame React state or DOM measurement. Small circle halos avoid blur/filter work. A one-second healthy timer reads the clock only; dimensions are re-read only for recovery/resize/pointer entry.

## Fresh checks actually performed

- `node scripts/verify-header-network.mjs <scratch-output>`: actual native Canvas 2D drawing and controlled DOM/RAF/ResizeObserver/timer events. Nine widths above, five seconds each, independently changing pixel hashes, single loop, mobile paint cap, no idle geometry reads, bounded nodes, pointer-local response/eased recovery, visibility, reduced motion, zero size, silent lost frame, pagehide/pageshow, focus, orientation, fallback and cleanup passed. A first targeted iteration failed the recovery assertion; liveness cadence was corrected before the successful final run/build.
- Separate native touch-handler test passed after aligning its reference clock with the 30 Hz paint cadence. This test does not certify touch on a phone.
- `node scripts/verify-header.mjs <scratch-output>`: actual React SSR and a limited authored CSS cascade/state evaluator passed at requested widths plus 1040/1041 breakpoint boundaries. Header height, logo/inner geometry and eager seven-trigger navigation remain stable in the source/SSR. **Not browser overflow or CLS measurement.**
- `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`: passed.
- Exactly **one** final production build through `build-site.mjs`: passed. No dependencies added and no dev server/watch process started.
- `node scripts/verify-header-production.mjs <scratch-output>`: short-lived production Worker emulator; eight successful page responses including repeated desktop/mobile homepage and delayed stream consumption, `/pdf-tools/pdf-compressor/`, `/image-tools/image-compressor/`, `/student-tools/percentage-calculator/`, `/about/`. Shared header assets and blocking CSS retrieved successfully; identical homepage SSR header across repeated desktop/mobile requests. **Zero captured Worker errors/warnings.** Worker disposed afterwards. Client JavaScript was not run in a browser.
- Native Canvas 390/1440 px render contact sheet at 0/2.5/5 s visually inspected: curved/fading network changes positions over time.
- `git diff --check`: passed. Prior CSS unchanged; only background declarations appended. Converter/tool source was not retested because it was not changed.

## Measured payloads

Actual saved v20 and new build files; gzipSync default compression used for both. File hash churn is not treated as payload growth.

| Payload | Before raw / gzip bytes | After raw / gzip bytes | Delta raw / gzip bytes |
|---|---:|---:|---:|
| Header chunk | 13,009 / 4,738 | 14,590 / 5,277 | +1,581 / +539 |
| Header static JS dependency closure | 420,778 / 130,126 | 422,359 / 130,662 | +1,581 / +536 |
| Source global CSS (not compiled CSS payload) | 98,394 / 20,935 | 99,654 / 21,314 | +1,260 / +379 |

These are file-size measurements, **not mobile performance scores**. Browser CPU/GPU cost, scrolling smoothness, frame rate, Lighthouse and Core Web Vitals were not measured.

## Remaining verification limits

The managed Sites workflow requires `$control-browser` for browser QA. It is unavailable in this session; its instruction is: **“If `$control-browser` is unavailable, skip browser QA.”** No preview server, alternative browser or physical phone was used.

Consequently, real production phone freeze reproduction/exact trigger, visible browser motion after real scroll/navigation/orientation, actual submenu open/close, cursor/touch GUI behavior, browser hydration/console messages, overflow, reload CLS, full gradients/readability/contrast and device performance remain **unverified**. Controlled scroll/pointer-exit and restoration events pass, but they do not substitute for these browser tests. No claim of completed physical-mobile acceptance, Lighthouse/CWV score, or zero browser console errors is made.

Evidence JSON files are under `docs/qa/2026-10-04-header-motion-backgrounds/`. Earlier tool limitations (including document-engine fidelity, native saved-file completion, physical phones, Lighthouse/CWV and the unreproduced Object.defineProperty incident) remain as previously documented; this visual pass neither resolves nor recertifies them.

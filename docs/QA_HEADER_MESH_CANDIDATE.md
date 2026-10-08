# Tool Fera — historical v22 header mesh evidence

**Historical:** the later static visual pass removes this network runtime entirely. See `QA_STATIC_GRADIENTS.md` for the current header. The tests and limitations below apply to the former v22 mesh only.

4 October 2026 (UTC). Baseline: saved/live **v21**, commit `efc049ce2b991caab88b142f147c920a10bb30a6`.

**Header-only candidate; physical-phone visual acceptance remains open.** The source fixes demonstrated clock defects and implements a denser mesh. The exact cause on the attached phone is still unknown. Publication was initially withheld. The user's resumed instruction explicitly permits publication with the strongest existing targeted checks if preview remains unavailable; the final native deployment receipt establishes the published version.

## 1. Phone evidence and exact cause — Not established

Both supplied attachments were inspected: desktop `image(20261004-101145).png` and the 5.873-second real recording `WhatsApp Video 2026-10-04 at 3.05.16 PM(1).mp4`. The desktop screenshot shows the sparse chain. Phone frames sampled at 0/1/2/3/5 seconds show static visible header geometry; the same three unobstructed node centroids are identical at 1, 2 and 3 seconds. Initial-frame encoding/contrast differs slightly. The recorder overlay at 5 seconds hides two measured regions, so that frame cannot certify every node. Other page effects change in the recording. This supports the user's reported **v21 mobile failure**, not acceptance of the candidate.

The recording cannot expose `matchMedia`, RAF counters, visibility, the animation clock, Android accessibility settings, canvas dimensions or remount events. Neither reduced motion nor stopped/throttled RAF can be declared the exact physical-phone cause from pixels alone. No physical phone was remotely connected.

## 2. Reduced motion — Phone unknown; preserved

The engine directly respects `matchMedia('(prefers-reduced-motion: reduce)')`. If true, it intentionally draws a static network. The existing hero/search full-effects behavior is independent of that check, so other moving effects in the video do **not** disprove a reduced-motion fallback in the header. An optional request to confirm the phone's Remove animations setting received no answer; no preference was inferred.

The actual Chrome production browser returned **reduced=false, visible, hidden=false, DPR=1**, with a 1348×73 logical/backing canvas at a 1363px outer viewport and CSS display:block/visibility:visible/opacity:1. Four actual browser screenshots over time show v21 desktop geometry changing. Their API capture delays are variable; they are **not** labeled as exact 0/1/2/3/5-second browser samples. The same phone's preference remains unverified.

## 3. Clock/lifecycle defect — Fixed in source; controlled verification

Fresh tests on the saved v21 engine demonstrated:

- First RAF after recovery advances by zero because the timestamp is cleared.
- Every later delta is clamped to 50ms. With five callbacks one second apart, a five-second interval renders phase **0.2 seconds**. This can make heavily throttled motion almost static.
- Repeated recovery before each first callback can continually reset the autonomous phase advancement to zero. The old 900ms liveness threshold also risks interfering with heavily throttled RAF.

The candidate uses an absolute **performance.now() monotonic active clock**, independent of callback cadence and callback timestamps. It pauses only for hidden/pagehide/reduced-motion states and resumes from preserved active time. Resize/focus/recovery cancel stale frame handles without resetting phase. The liveness threshold is now 2500ms (checked once per second) rather than 900ms. Healthy frames make no DOM measurements. Zero-size recovery, canvas/host ResizeObserver, capped DPR, orientation, visibility and pageshow cleanup remain.

Controlled tests now verify phase **5 seconds** after one-Hz callbacks, continuous phase despite repeated recovery, one frame loop, no normal frame layout reads, zero-size recovery, lost-frame recovery, visibility/page restoration, orientation, reduced-motion static/resume, observer fallback and full cleanup. These reproduce **source logic defects**, not the exact condition on the recorded phone.

Opt-in `?header-network-debug=1` adds a local `data-network-diagnostics` attribute on the decorative canvas, updated about once per second. It contains reduced-motion/visibility/pause state, RAF/paint counts, phase, last callback timestamp/age, pending frame, logical/backing size, DPR, restart count, nodes/connections and geometry. There is no visible setting, remote telemetry or per-frame React state. These diagnostics have not yet been observed on the physical phone.

## 4–6. Mesh, density and logo falloff — Implemented; browser candidate unverified

| Area | Saved v21 | Candidate |
|---|---|---|
| Topology | One adjacent-node chain plus sparse longer branches | Seeded asymmetric local clusters, two independent depth layers, nearest neighbours in adjacent spatial buckets; no all-pairs frame search or obligatory continuous chain |
| Connections | Curves mainly follow the single chain | Varied short and occasional longer local links, live distance fading, opacity phases and travelling pulses; connections prepared at resize |
| Node cap | Mobile 8–10, tablet 12–16, desktop 18–24 | Mobile 12–18, tablet 20–28, desktop 30–42, large desktop 36–48; count derived from measured canvas width **and height** |
| Logo | Same density as elsewhere | Actual logo right edge measured only at resize. Two quiet nodes on mobile / three above mobile; remaining clusters biased centre/right. Opacity ramps smoothly from 22% near the logo to full network strength past the falloff zone. No fully erased left zone |
| Depth | One main chain | Thin/slower/low-opacity background and brighter/faster interactive foreground; small circle halos, no blur/filter effects |

Actual native-render model examples: **390×64 = 15 nodes, 21 connections, 2 quiet nodes** (v21: 8 nodes/9 links); **1440×73 = 39 nodes, 58 connections, 3 quiet nodes** (v21: 19 nodes/22 links). Node counts vary with real canvas dimensions: at 360×64 the formula gives 14, while the regression harness's 360×65 fixture gives 15. These are source/model measurements, not a physical viewport read.

The native design contact sheet at 0/1/2/3/5 seconds was inspected. It shows multiple changing groups with a quieter left side. It is expressly **not browser/phone visual acceptance**.

## 7–8. Speed and interaction — Implemented; controlled verification

Foreground nominal maximum drift speed is approximately **1.8× v21**, with independent speed factors 0.88–1.12. Background layer applies a further 0.68 factor for depth.

| Parameter | v21 mobile / desktop | Candidate mobile / desktop |
|---|---:|---:|
| Main horizontal angular rate (rad/s) | 0.53 / 0.58 | 0.76 / 0.86 |
| Main horizontal amplitude (px) | 7 / 9 | 9 / 11 |
| Vertical angular rate (rad/s) | 0.70 / 0.76 | 0.95 / 1.04 |
| Vertical amplitude (px) | 5.5 | 7.2 |
| Pulse cycle (s) | 5.8 / 5.2 | 3.8 / 3.4 |
| Pointer easing rate | 12 | 15 |

Pointer influence stays bounded at 9px horizontal / 6px vertical and affects nearby foreground nodes, links and glow. Background remains quieter. It eases back after leave; optional touch influence still expires after 650ms. Passive wrapper listeners and pointer-events:none prevent intercepting controls. Controlled pointer-event displacement max **4.797px** and smooth decay/locality checks passed. No physical tap/desktop candidate cursor GUI acceptance is claimed.

## 9. Verification — Partial, manual phone acceptance remains open

**Actually performed now:**

- Real uploaded screenshot and recording review, timestamped phone crops and node measurements.
- Actual Chrome **live v21 desktop** observation, motion preference/dimensions/CSS reads and screenshot sequence. Its captured console error was a browser-extension metadata error (`chrome-extension://...`), not a Tool Fera exception. No Tool Fera error was observed in that limited v21 check.
- Updated native Canvas/controlled scheduler tests at **320,360,375,390,430,768,1024,1280,1440**, five seconds each; 150 mobile / 300 larger paint calls at target cadence. Actual source painter, not a mock painter. Fresh repeated-recovery and one-Hz clock regressions passed. These are supplementary tests, not acceptance substitutes.
- Final TypeScript check passed; exactly **one** final production build passed.
- One essential candidate production Worker check: desktop/mobile homepage SSR and header assets/CSS served 200; shared header tree unchanged; **zero Worker errors/warnings**. Client browser JS was not executed by this check.
- Full stylesheet byte-identical to v21. Only production runtime file changed: `components/site/header-network-engine.ts`. No tool, converter, OCR, navigation, routing, SEO, search, card, gradient or download implementation changes.
- Preview service stopped; no new dependency, dev watcher or interactive process left running.

**Updated actual browser verification blocked:** the managed preview reported running but nothing listened on 4173; the browser got ERR_CONNECTION_REFUSED. One supervised stop/start did not repair it. The isolated SSR/header fixture was generated but local-file navigation was rejected by browser URL policy; no workaround was attempted. The fixture was **not executed**. Temporary public review HTML was removed before building; no new public route ships.

The browser's read-only DOM inspection API also lacks RAF/toDataURL methods; those inspection attempts are API limitations, not site runtime exceptions. The actual production screenshots were used instead. No phone setting was changed and no reduced-motion override was added.

**Resume after interruption:** the existing working tree and produced build were inspected; the clock fix, mesh and test evidence were intact. No runtime code change, repeated TypeScript check or repeated production build was required. One managed-preview availability check reported running, but the existing failed preview tab could not be bound because the browser URL policy rejected its error-page protocol. No workaround or repeated infrastructure recovery was attempted. The managed preview was stopped. Existing targeted tests are retained, not presented as newly rerun tests.

**Still not verified:** the candidate's normal-motion live browser rendering/hydration, actual mobile 0/1/2/3/5-second geometry, phone reduced motion/RAF/visibility, scroll/menu close/open/orientation on a real device, candidate browser console, actual overflow/CLS, phone CPU/GPU/FPS or smoothness. The physical-phone freeze acceptance is **not passed**. The resumed user instruction authorizes publishing the existing verified candidate with this limitation disclosed; publication does not certify physical-phone behavior.

## 10. Payload/performance — Bytes measured; device performance unknown

| Payload | v21 raw / gzip bytes | Candidate raw / gzip bytes | Delta |
|---|---:|---:|---:|
| Header chunk | 14,590 / 5,277 | 16,886 / 6,361 | +2,296 / +1,084 |
| Static header JS dependency closure | 422,359 / 130,662 | 424,655 / 131,747 | +2,296 / +1,085 |

Both use actual production files and gzipSync defaults. CSS unchanged. Canvas targets remain 30 mobile / 60 larger paints per second, DPR capped at 1.5, maximum 48 nodes, bounded nearest-neighbour links, no heavy library or per-frame React/DOM measurements. Optional diagnostics allocate/write only at their sampling cadence. Richer mesh draw cost on an actual phone is **not measured**. No Lighthouse/Core Web Vitals score or no-lag guarantee is invented.

## 11. Publication and remaining manual check

The existing source/build is prepared for publication to the same Tool Fera site, preserving its public audience. The final native saved-version/deployment receipt reports the actual version and outcome; neither is assumed here. The actual phone motion preference and callback/clock state, or a working preview of the candidate in a mobile browser, are still needed to resolve visual acceptance. Normal phone reduced-motion=true correctly requests a static fallback; it must not be secretly overridden.

Manual acceptance: with normal motion enabled, watch the header for five seconds without touching it, then scroll, open/close navigation and rotate the phone. Check that the richer network visibly moves throughout and the logo area stays quieter. With reduced motion enabled, a static network is expected. If it freezes with normal motion, the opt-in local diagnostics can distinguish RAF, clock, visibility and size state; the recording alone cannot do that.

Main runtime file: `components/site/header-network-engine.ts`. Tests/evidence: `scripts/verify-header-network.mjs`, `scripts/verify-header-production.mjs`, optional `scripts/create-header-browser-fixture.mjs`, `docs/qa/2026-10-04-header-mesh-candidate/`. Earlier conversion/tool reports remain historical scoped evidence and were not rerun or upgraded by this task.

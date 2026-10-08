# Tool Fera — targeted header follow-up

**Historical v19 background snapshot:** `QA_HEADER_NETWORK.md` documents the later background-only canvas replacement. The navigation/reload implementation below remains unchanged, but its CSS dot/glow animation and associated evidence describe v19.

Verified **4 October 2026 (UTC)**, continuing saved v18 at `26ccb3aed115623dfc6d215429868e4dcdb3d2b3`. Scope: mobile navigation feedback, header background and first-render stability only. Working tools, document converters, OCR, route definitions, metadata, logo, hero/search animations and tool action/download logic were not changed. No full-platform QA was repeated.

**Implementation is complete; browser/physical-phone acceptance remains unverified.** The available checks establish source/SSR/CSS/production-HTTP behavior, not visible motion, touch response or measured layout shift.

## Changes and evidence

| Requested area | Implementation | Verification status |
|---|---|---|
| Mobile tap feedback | Category summaries, tool/resource links, menu/search controls and close control have press movement, blue inset/background/border feedback and visible keyboard focus. Tool/resource links have at least 44 px authored height; category summaries at least 56 px. | Authored CSS state checks passed; physical taps not observed |
| Selected/open state | Native `details[open]` shows a persistent blue background/border/inset accent and rotated chevron. Current category and `aria-current=page` links stay highlighted. Resource route state was added. | Actual React-rendered markup and CSS state checks passed; GUI interactions unverified |
| Open/close response | Existing native details/dialog behavior retained; links receive a short entry transition. Mobile dialog gets a 140 ms close transition with duplicate-close protection and unmount timer cleanup. Reduced-motion closes immediately. Search dismissal retains its immediate behavior. | Implemented/source-reviewed; actual dialog/keyboard/focus return not operated here |
| Old bottom strip | Removed the `header-energy` element, its particle/stream children, all associated selectors and keyframes. | Absent from source-rendered header and compiled production HTML/CSS |
| Premium background | One decorative, clipped, pointer-transparent span covers the full header. Its two pseudo-elements draw eight small radial dots plus faint cobalt/cyan/indigo glow/streak gradients behind the logo/navigation. Only transforms/opacity animate. No animation library, canvas, particle DOM list or animation JS loop. | Source and production stylesheet/asset checks passed; visual appearance not observed in a browser |
| Mobile motion | Continuous alternate drift/glow is configured at every tested width: 12/16 seconds on mobile, 14/18 seconds on larger layouts. No viewport state, hover, timer or observer enables/disables the background animation. An unconditional header-scoped OS reduced-motion rule produces a static fallback, including when the root's existing full-effects flag is set. | CSS state checks passed for normal/reduced motion; visible movement over time unverified |
| Reload stability | Eagerly render the existing desktop menu in SSR and the initial client tree; CSS alone switches desktop/mobile visibility. Remove the static fallback and its conflicting margin reset. Header/logo/actions reserve their geometry; scroll state changes decoration, not dimensions/margins/logo scale. | Repeated actual SSR, responsive CSS geometry and production HTTP checks passed; first-paint/CLS browser measurement unverified |
| Performance/scope | No dependency was added. Existing header blur remains; the new background adds no filter/blur. Desktop menu code is initially available instead of fetched after the viewport effect. | One build passed and artifact sizes were measured; frame rate/Lighthouse/CWV not measured |

## Source-identified reload cause

Previously, `Header` initialized its desktop state to false. Both SSR and the first client render emitted a `static-navigation` fallback. After `matchMedia('(min-width: 1041px)')` ran in an effect, React replaced it with a lazy menu. The fallback used direct links; the final menu uses a `ul` and buttons. In the stylesheet, `.nav-list,.static-navigation { margin:0 }` overrode `.desktop-navigation { margin-left:auto }` on the fallback. Removing the fallback class therefore changed alignment after initialization. Scroll observation could also change the inner header's height/margin and scale the logo, including on a restored scroll position.

Those concrete source paths were removed. This is a source/stylesheet diagnosis, **not a reproduced slow-browser recording**. No evidence established a font-loading or hydration-mismatch cause; the header retains the existing system-font stack. Initial production documents contain normal, non-deferred stylesheet links in the head before the header. There is no artificial loading screen or delayed header mount.

## Tests actually performed

- `tsc --noEmit --incremental false --pretty false` passed.
- `scripts/verify-header.mjs` rendered the actual React header five times each for home, a PDF-tool route and contact: the repeated markup matched and all seven desktop category triggers were initially present. The PDF category/tool route state was checked. Real mobile-navigation markup retained native details/summaries and the exact current tool link.
- Its limited authored-CSS cascade evaluator passed at **320, 360, 375, 390, 430, 768, 1040, 1041, 1280 and 1440 px**: desktop/mobile visibility, stable scroll-state geometry, press/focus/open/current styles, continuous animation configuration and static reduced-motion fallback. This evaluator is not a browser layout engine; it does not measure overflow or animation frames.
- Exactly **one** final production build passed via the Sites build helper.
- `scripts/verify-header-production.mjs` used a short-lived built-Worker emulator. Five requests passed: two desktop home responses, two mobile home responses and one mobile PDF-tool response. All home header fragments were identical. All responses contained the seven menu triggers and two blocking stylesheet links; retrieved styles included both new keyframes and no old strip/fallback selectors. All files in the header's static dependency closure served HTTP 200.
- One mobile response was consumed with a 40 ms delay per stream read. It remained complete/identical. This checks delayed document delivery only; **it is not a throttled browser render or a no-flash screenshot test**.
- Production Worker error and warning logs were both empty. The emulator was disposed. No preview server, dev watcher or browser automation was started.
- `git diff --check` passed. Runtime changes are confined to the three files listed below.

Fresh machine-readable evidence: `docs/qa/2026-10-04-header/source-checks.json`, `production-checks.json` and `before-bundle.json`.

## Measured artifacts

| Artifact | Before raw/gzip bytes | After raw/gzip bytes |
|---|---:|---:|
| Header chunk | 6,179 / 2,355 | 9,229 / 3,255 |
| Unique files in header static dependency closure | 414,386 / 127,990 | 416,998 / 128,640 |

The static closure increases by 650 summed gzip bytes. These are physical-file measurements, including shared existing runtime/search/icon code; they are not route payload measurements, browser network transfer totals or performance scores. The production manifest has no deferred desktop-navigation import from the header.

## Remaining limits

- The managed browser capability is unavailable. Desktop/mobile visible motion, taps, actual dropdown open/close, GUI keyboard navigation, horizontal overflow and readability were **not directly observed**.
- Repeated real browser reloads, initial paint on slow networks, hydration/browser-console errors, frame rate and physical-phone behavior remain unverified. Empty Worker logs do not certify browser console behavior.
- The exact cause of the previously reported frozen header motion was not reproduced on a phone/browser. The replacement removes JS/viewport gating and ships continuous transform keyframes; that establishes implementation, not physical-device acceptance.
- No Lighthouse, Core Web Vitals, performance score, saved-file completion, download, converter or unrelated-tool acceptance claim is made by this follow-up.
- Native publication confirms deployed source/build identity, not the unobserved visual/interactions above. The final deployment response supplies the published version and URL.

## Files changed

Runtime: `components/site/header.tsx`, `components/site/header-overlays.tsx`, `app/globals.css` (header/mobile-navigation selectors only).

Targeted verification: `scripts/verify-header.mjs`, `scripts/verify-header-production.mjs`. Root/docs QA and the implementation report only receive a pointer to this separate follow-up; their preceding document-conversion evidence is preserved without rerunning or recertifying it.

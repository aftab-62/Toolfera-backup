# Tool Fera — targeted document-conversion QA

**Latest resource/branding pass, 4 October 2026:** `docs/QA_RESOURCE_PAGES.md` records the shared desktop/mobile logo asset, six resource/legal pages, the genuine guide, premium 404, scoped metadata, fresh rendered/link/production-Worker checks, TypeScript and one build. Mobile browser/physical-phone and OS reduced-motion acceptance remain explicitly unverified; unchanged tools were not retested.

**Latest targeted pass, 4 October 2026:** `docs/QA_IMAGE_PDF.md` records smart image-to-PDF encoding, adaptive compressor rendering, the three mobile geometry changes, fresh representative measurements and explicit missing-original/mobile-browser limits. Earlier evidence below is historical for unchanged areas.

**Latest visual pass, 4 October 2026:** `docs/QA_STATIC_GRADIENTS.md` records the complete header-network removal, static navy header/logo treatment, cohesive light backgrounds and fresh targeted source/build/Worker checks. Mobile browser appearance and physical-phone acceptance are explicitly unverified; the managed preview refused the connection. The native deployment receipt establishes the published version. Older network reports are historical and describe animation that has now been removed. Document/tool evidence below is preserved without rerunning it.

Verified: **4 October 2026 (UTC)**. Scope: the attached current instructions, PDF → Word main-story behavior, and the attached broken Word → PDF regression. This is not a new full-platform QA. Root `QA.md` and `docs/QA.md` are identical; earlier reports in `docs/history/` are historical, not current acceptance evidence.

The work continued the existing public site/repository from saved v17, starting commit `35ee820f501f1f716dce436e5014a3aa31b4bc6e`. Existing site identity, branding, routes, SEO, OCR tools, compressor, navigation, homepage and animations were preserved. No new mode, paid API, database, remote document upload or OCR conversion path was added.

## A. PDF → Word — Completed, with verification limits

Native PDF extraction and the successful paragraph/table/graphic detection were preserved. The DOCX packer now writes ordinary paragraphs/headings/runs/hard line breaks and real tables directly into `w:body`. There are **zero `w:txbxContent` elements**. Only decorative rules and localized graphics are page-anchored. Native font sizes, weights, italics, measured widths, tab stops, indents and exact leading are retained as Word run/paragraph properties. Every source page closes with an explicit section boundary.

Intentional gaps use normal empty paragraphs, with a content-derived left margin. These provide real insertion points in the main story. Empty/anchor/section paragraphs are reported separately from paragraphs containing text. Source line/table/image detection and all localized image bytes were checked against the prior saved conversion outputs; no extracted text run was lost or duplicated.

| Fixture | PDF pages | Rendered DOCX pages | Direct body paragraphs | Body paragraphs with text | Main-story `w:t` | Text boxes / box `w:t` | Editable tables | Images |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| BudgetMate | 16 | 16 | 677 | 134 | 500 | 0 / 0 | 9 | 3 |
| alcheMe | 16 | 16 | 755 | 245 | 4532 | 0 / 0 | 1 | 0 |

BudgetMate has 543 empty/anchor/boundary body paragraphs; alcheMe has 510. All substantial normal text is in the main story, including table cells. BudgetMate contains 46 multi-line body paragraphs, alcheMe 41. All 16 pages of each generated DOCX were rendered through the canonical LibreOffice workflow at 120 DPI and visually compared with the original PDFs. Cover, Declaration, body, footer/page numbers, all nine BudgetMate tables, university logo, architecture diagram on page 10 and Gantt chart on page 13 remain present. The three graphics have unchanged bytes and bounds; no whole page is inserted as an image.

After the final margin adjustment, 31 of 32 rendered pages were pixel-identical to the immediately preceding inspected main-flow renders. BudgetMate's cover changed only by at most **0.0501 pt horizontally**, with zero baseline movement and unchanged text. That final cover was separately visually inspected. These are internal before/after comparisons, not a claim that the DOCX is pixel-identical to the original PDF.

Main-story selection across paragraphs/pages and Ctrl+A/copy are **structurally supported** by the normal Word body. A heading and a real empty paragraph were edited in DOCX XML, then successfully rendered by LibreOffice: the edited heading and inserted text are visible, the inserted text starts at the 72 pt body margin, and the document remains 16 pages. This verifies real editable content and body insertion, not interactive clipboard behavior in Microsoft Word/WPS.

## B. Word → PDF — Completed for the supplied regression

### Reproduced root cause

The attached DOCX has 16 page-anchor body paragraphs, 246 floating text/table objects, 4,532 `w:t` elements and **zero ordinary direct body text elements**. Each outer page anchor has exact line height **1 twip = 0.05 pt**. The old parser recursively gathered every descendant run from nested `w:txbxContent` into the outer paragraph, losing its own paragraph styles, table hierarchy and physical position. The old renderer advanced that flattened text by its 0.5 pt minimum, while drawing full-size glyphs. This produces the measured and visually observed one-row collapse on every page of the attached broken PDF. The problem was ownership/structure plus line metrics, not OCR.

### Changes

- Paragraph parsing now includes only runs whose nearest owning `w:p` is that paragraph.
- VML/DrawingML text objects are parsed as independent legacy frames with their own paragraph/table content, coordinates, dimensions and cursor. New PDF → Word outputs do not use those frames.
- Native DOCX page/section geometry, margins, paragraph/line heights, before/after spacing, indents, tab stops, font families/styles and measured run fitting feed a dedicated DOCX page renderer.
- Tables honor grid widths, cell margins/borders, exact/minimum row heights and editable cell paragraph content; images/rules retain physical placement.
- Each normal block consumes its actual measured height; explicit/saved breaks and section starts retain boundaries and intentional blank pages. Invalid tiny heights on actual text produce a warning and safe leading, while tiny empty anchors remain empty.
- PDF text is emitted as genuine searchable/selectable text operators, never whole-page screenshots. Compatible sans/serif/monospace fonts are used; no OCR is invoked.
- Invoice rendering remains on its existing renderer path; a one-page total/selection smoke test passed.

**Attached regression:** original DOCX renders to **16 pages** in LibreOffice; broken supplied PDF = **16 pages**; repaired Tool Fera PDF = **16 pages**. All pages were compared visually with the DOCX reference. Whitespace-normalized native text matches that reference on **each of the 16 pages**, without loss, duplication or moved page content. The table remains on page 16. The attached DOCX contains no images; image preservation was additionally exercised using the BudgetMate round trip and a synthetic DOCX with an inline image.

| Page | Visual comparison with DOCX reference | Selectable text matches | Maximum baseline difference (pt) |
|---:|---|---|---:|
| 1 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.200 |
| 2 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 3 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 4 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 5 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 6 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 7 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 8 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 9 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 10 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 11 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 12 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 13 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 14 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.100 |
| 15 | Close; paragraph order/blank areas retained; no collapse | Yes | 0.101 |
| 16 | Close; table rows retained; no collapse | Yes | 0.425 |

Across all pages, the maximum measured baseline difference is **0.425 pt**. The broken PDF's per-page text baseline ranges were only 0.5–19 pt; the fixed output restores the corresponding reference ranges of approximately 52.6–659.6 pt. These are coordinate measurements, not a similarity/performance score. Native Word → PDF round trips of the two new main-flow DOCX files also produce 16 pages each.

## C. Tests actually performed

| Check | Current result / evidence |
|---|---|
| Real BudgetMate/alcheMe PDF conversions | Pass; native layout unchanged, text-run multiset unchanged, no boxes, direct editable tables, identical graphics |
| Real DOCX rendering | Pass; 16 pages each, all pages compared visually |
| Main-story edits and blank-space insertion | Pass in XML + LibreOffice render; 16 pages |
| Attached legacy DOCX → PDF | Pass; 16 pages, all pages visually reviewed, each page's native text matches reference |
| New DOCX → PDF round trips | Pass; both 16 pages; BudgetMate's three images retained |
| Explicit/saved breaks, blank page, section margins/landscape, spacing, saved header/footer text, table and inline image | Pass in targeted six-page synthetic DOCX |
| Invoice shared-renderer guard | Pass; existing render path, one page, total USD 22.00 |
| Actual Word worker source handler | Pass in Node with local font-fetch adapter; archive read, 16-page conversion, four font requests, final-page progress |
| Damaged archive / unsupported action / aborted parse | Pass; human errors or AbortError, no raw exceptions leaked by the worker |
| OCR isolation | Zero OCR worker calls in targeted native conversion tests; no OCR dependency in PDF engine closure or compiled Word worker |
| TypeScript | Pass: `tsc --noEmit --incremental false --pretty false` |
| Production build | One final build passed via the Sites build helper |
| Built production Worker | Pass for the two conversion routes (HTTP 200), one H1/canonical each, existing PDF → Word application/breadcrumb/FAQ schema, PDF engine/worker, Word worker and font assets (HTTP 200) |
| Worker error logs in production smoke test | Empty; emulator warned that unavailable `Request.cf` metadata used its default placeholder |
| Whitespace/diff check | `git diff --check` passed |

The managed browser skill is unavailable in this environment. No preview server, dev watcher or improvised browser automation was started. The short-lived production Worker emulator was disposed after checking the two affected routes. The production route check initially looked in the wrong generated asset directory; the test harness was corrected to the actual `_next/static/` path and passed. No runtime source change or extra production build was required for that harness correction.

## D. Measured bundles and boundaries

These are physical files from this build, not performance scores or total route payloads. Dependency chunks/fonts are excluded from these per-file measurements.

| Artifact | Raw bytes | Gzip bytes |
|---|---:|---:|
| PDF → Word lazy engine | 32596 | 13134 |
| PDF → Word component | 6240 | 2581 |
| Word → PDF component/parser | 17229 | 6865 |
| Lazy Word conversion worker | 1156350 | 509267 |

Heavy conversion still runs on-device/lazily; OCR assets do not load for normal document conversion. No dependency or service was added. No Lighthouse, Core Web Vitals, physical-phone timing or overall-platform performance measurements were performed.

## E. Remaining limitations — explicitly unverified / technically limited

- Microsoft Word/WPS GUI selection, Ctrl+A/C/V, mouse placement and interactive typing were not directly operated here. Main-story XML and editable rendered changes prove structural support; they do not establish vendor-specific GUI behavior.
- Browser/mobile console, physical phone behavior, native saved-file completion and interactive downloads were not verified in this scoped run. Their runtime code was not changed.
- Small font substitution, half-point font rounding, rule rendering and spacing differences remain possible. Large edits can reflow normal Word content and change page count. Some original line breaks/hyphens are retained; inherited Word margins are approximated from PDF coordinates rather than recovered original Word metadata.
- PDF → Word tables still depend on recoverable native layout. Complex diagrams remain localized images; their internal diagram text is not editable, while surrounding text is normal Word text.
- DOCX columns, vertically merged/nested tables, complex header/footer drawings, dynamic fields, uncommon fonts/scripts and unsupported shape types may require manual review. Exact Word/WPS pagination for arbitrary documents is not guaranteed. Oversized table rows fail with a useful message rather than packing text into a collapsed line.
- The previously mentioned `Object.defineProperty` issue was not reproduced or claimed fixed by this work. The independently reproduced document-collapse cause is documented above.
- Full-site QA, route/tool totals, sitemap/robots, unrelated tools/animations and mobile responsiveness were not rerun or newly certified. Old QA claims are not imported into this report.

## Main files changed

`tools/pdf-editable-docx.ts`; `tools/word-docx-parser.ts`; `tools/word-pdf-model.ts`; `tools/word-docx-render.ts`; `tools/word-pdf-render.ts`; `components/site/pdf-word-tool.tsx`; `components/site/word-pdf-tool.tsx`.

Targeted reproducible harnesses: `scripts/verify-document-flow.mjs`, `scripts/verify-word-pdf-layout.mjs`, `scripts/verify-word-pdf-worker.mjs`, `scripts/verify-document-flow-production.mjs`. Private input files, text extracts, generated document fixtures and rendered pages stay outside the source repository/public website.

This report records the validated source/build and generated files. The existing site's native deployment result establishes the published version; source-only documentation does not substitute for that deployment result.

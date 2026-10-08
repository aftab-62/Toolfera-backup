# Tool Fera — PDF to Word paragraph copy QA

**4 October 2026 (UTC). Scope: PDF to Word paragraph containers only.**

`QA.md` and `docs/QA.md` contain the same current report. `IMPLEMENTATION_REPORT.md` describes this same change. This is a targeted follow-up, not a full-platform QA run. The starting published baseline was version 16, source commit `f61d61518f3823fc2071c43d7783256835269e18`. That version number identifies the BEFORE baseline; this report describes the subsequent paragraph-copy fix.

The saved source was opened from the existing repository. Both original PDFs and the current editable DOCX outputs were resolved as the regression fixtures. Fresh before conversions produced identical document XML to those saved DOCX outputs. Previous QA conclusions were archived, not assumed to be current test results.

## Change and cause

Only runtime file `tools/pdf-editable-layout.ts` changed. Its previous grouping thresholds separated BudgetMate’s Declaration lines because their 28.89-point spacing exceeded 2.18 times the font size. Wrapped list text with approximately 10.04-point hanging indentation also exceeded the prior 10-point alignment tolerance. Separate positioned containers then interrupted selection at those boundaries.

Continuation detection now accepts consistent wider-spaced full lines and measured first-line/hanging indentation. It keeps existing successful groups, excludes new list-item markers from the relaxed continuation rules, and keeps headings separate. A merged container starts at the leftmost source line; the existing DOCX packer retains each line’s measured horizontal offsets, native runs and explicit line breaks inside one genuine `w:p` and one `w:txbxContent` story.

The native extractor, DOCX packer, tables, localized images/vector crops, source-page sections, UI, OCR, Word to PDF and unrelated tools were not modified. No OCR, page screenshot fallback, alternate conversion mode, new dependency or plain reflow path was introduced.

## Fresh results

| Fixture | PDF / before DOCX / after DOCX pages | Text containers before → after | Multi-line paragraphs before → after | Real `w:t` elements | Word tables | Images |
| --- | --- | --- | --- | ---: | ---: | ---: |
| BudgetMate | 16 / 16 / 16 | 156 → 134 | 31 → 46 | 500 | 9 | 3 |
| alcheMe | 16 / 16 / 16 | 245 → 245 | 41 → 41 | 4,532 | 1 | 0 |

BudgetMate’s entire six-line Declaration is now one editable Word paragraph in one positioned container. Its complete extracted paragraph text contains 467 characters including preserved line breaks. All eight wrapped list items on page 4 include their continuation text in their own paragraph container. alcheMe’s wrapped body paragraphs already shared containers; those groups and its entire document XML remain unchanged.

Programmatic copy checks traversed **all 379 after-conversion paragraph containers**, including **87 multi-line paragraphs**. Every container contains one Word paragraph; all its text and source line breaks occur in the same editable story. Whitespace-normalized text extracted from each story matches all the native lines assigned to that paragraph. No paragraph loses later lines during this logical copy check. This validates continuous content within the Word story; it is **not a claim of a manually performed Microsoft Word/WPS drag-selection or clipboard test**.

Both outputs retain exactly 16 page sections. Native line strings, coordinates, font/style properties and page assignments are unchanged. Document-wide Word text hashes are unchanged: 19,567 characters for BudgetMate and 13,961 for alcheMe. Every real table’s XML and every localized image’s bytes match the fresh before conversion. Table/image bounds, drawing rules and page dimensions match as well.

Both before and after DOCX files were freshly rendered using the canonical LibreOffice renderer at **120 DPI**. All **32 before/after page image pairs are pixel-identical**: zero changed pixels in each pair. Every after page was visually inspected. Page sizes match the corresponding source PDF pages within 0.1 point; both documents remain 16 pages. The cover, Declaration, architecture diagram on BudgetMate page 10, Gantt chart on page 13, editable tables, footers, images and intentional blank areas show no change from the approved before layout. This is before-versus-after equality in the tested renderer, not pixel-perfect equality to the source PDF or a guarantee for every Word editor.

A real text run in a multi-line paragraph on page 2 was changed in a separate test copy of each output. The changed text appeared in actual LibreOffice PDF renders; both edited copies still had 16 pages. The delivered regression outputs retain the original text.

## Final checks

| Check actually performed | Result |
| --- | --- |
| Both real PDF conversions / ZIP / OOXML inspection | Passed |
| Complete paragraph-story text and line-break checks | Passed for 379 paragraphs, including 87 multi-line paragraphs |
| Declaration and wrapped-list continuation checks | Passed |
| Text, table, image, drawing and page-geometry preservation | Passed |
| Before/after rendering and all-page image comparison | Passed: 32/32 identical at 120 DPI |
| Multi-line paragraph edit and actual render | Passed for both fixtures; 16 pages retained |
| OCR isolation during the native conversions | No OCR invocation; worker trap count 0 |
| Graphic canvas cleanup | Width/height reset observed |
| TypeScript | Passed: `tsc --noEmit --incremental false` |
| Final production build | Passed; one final build |
| Built PDF-to-Word route | HTTP 200, one H1, canonical present and application/breadcrumb/FAQ JSON-LD parseable |
| Built conversion chunk and pinned PDF worker asset | HTTP 200; engine dependency closure excludes OCR |
| Final targeted conversion / built Worker runtime checks | Passed; no unhandled conversion error or built-Worker error observed |

PDF.js emitted its Node legacy-build advisory. Miniflare could not fetch `Request.cf` metadata and used its default placeholder; the bounded built-Worker check passed and exited. The build’s existing route-classification notice remains. These observations do not amount to a clean browser-console claim.

Evidence: `docs/qa/2026-10-04-pdf-word-paragraph-copy/regression-results.json` and the adjacent logs. `scripts/verify-pdf-word-paragraph-copy.mjs` executes both real-file conversions and protection checks. Private PDFs, extracted document content, generated DOCX files and screenshots remain outside the repository/public website assets. The previous reports are archived in the same evidence directory.

## Limits and checks not performed

- Direct mouse/touch selection and clipboard behavior in Microsoft Word or WPS Office were not available to test. Shared-story structure and actual edit/render behavior passed; editor UI verification remains outstanding.
- Paragraph detection is geometric. Unusual layouts may still require manual editing. Distinct paragraphs/headings remain separate positioned containers; this does not promise selection across every separate container or unrestricted document reflow.
- Original compatible-font mapping, finite-unit/font rounding and Word-editor rendering differences remain. Larger edits may require resizing fixed containers. Localized diagram/chart labels remain part of images.
- No physical-phone test or fresh browser-console/hydration run was performed. The supported managed browser-QA capability was unavailable. No Lighthouse/Core Web Vitals, native saved-file completion, performance score, total route count or tool count is asserted.
- The historical exact `Object.defineProperty` root cause was not reproduced; this update makes no claim to identify it.
- Other conversion modes/tools, upload/progress/button/download animations, navigation, homepage, mobile styles and general platform QA were unchanged and were not repeated.

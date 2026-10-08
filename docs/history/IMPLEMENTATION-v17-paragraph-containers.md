# Tool Fera — PDF to Word paragraph copy implementation

**4 October 2026 (UTC).** Only PDF-to-Word paragraph grouping changed. The starting source was the existing published version 16. `QA.md` and `docs/QA.md` describe the same fresh targeted results; previous reports are archived under `docs/qa/2026-10-04-pdf-word-paragraph-copy/`.

| Requested area | Status | Implemented and verified result | Main file |
| --- | --- | --- | --- |
| One container for a complete paragraph | Completed for identified BudgetMate continuations | Consistent wide-spaced full lines and hanging/first-line indentation join existing paragraph groups. The six-line Declaration and wrapped page-4 list items are complete single-container paragraphs. | `tools/pdf-editable-layout.ts` |
| Preserve successful layout | Completed for both regression fixtures | Native line positions/fonts/styles unchanged; all 32 freshly rendered before/after page pairs pixel-identical at 120 DPI. Each PDF and each before/after DOCX has 16 pages. | Layout grouping; existing packer unchanged |
| Preserve real text and continuous paragraph content | Completed structurally | All 379 output paragraph stories contain one `w:p`; complete source-line text/line breaks verified, including 87 multi-line paragraphs. No text loss/duplication. | Layout grouping; existing native runs/packer |
| Real editability | Completed in OOXML/LibreOffice | Text changed inside a multi-line paragraph in a test copy of each document appears in its actual render; both remain 16 pages. | Targeted regression tests |
| Tables/images/vector figures/page boundaries | Completed preservation checks | Real table XML, image bytes/positions, drawing rules, page dimensions and sections unchanged. BudgetMate retains nine tables, logo/architecture/Gantt images; alcheMe retains one table and no images. | Existing table/graphics/section code unchanged |
| Direct Word/WPS selection and clipboard | Partially verified / editor UI unavailable | A complete paragraph shares one editable Word story; actual Microsoft Word/WPS drag-selection and clipboard were not performed. | Limits in `QA.md` |
| TypeScript / final build / built target route | Completed | TypeScript, one production build, target route/assets/structured-data and bounded Worker checks passed. No built-Worker error observed. | `scripts/verify-pdf-word-paragraph-copy.mjs`, existing production check |
| Unrelated tools/design/animations/OCR/Word to PDF | Not applicable; unchanged | No runtime modifications, new dependencies, OCR, screenshot fallback or full-platform retesting. | Outside this scoped change |

BudgetMate text containers decreased from 156 to 134; multi-line paragraphs increased from 31 to 46. Its 500 real text elements and 19,567 Word text characters are unchanged. alcheMe already grouped its wrapped prose correctly: 245 containers, 41 multi-line paragraphs, 4,532 real text elements and 13,961 Word text characters remain; its document XML is unchanged.

The original issue came from narrow spacing/alignment thresholds that created separate text-box stories for lines of the same paragraph. The fix changes those grouping decisions while using the successful native-text extraction and DOCX packaging unchanged. All original line breaks and page assignments remain.

Only `tools/pdf-editable-layout.ts` is a changed runtime file. The new targeted engine test, reports and sanitized evidence are the other repository changes. No private fixtures, DOCX outputs or page screenshots are published as website assets.

Remaining limits: direct Word/WPS UI/clipboard testing, physical-phone/browser-console testing and native saved-file completion are unverified. Paragraph grouping remains geometric; complex layouts or large edits can need manual adjustment. Different editors/font substitutions can render differently. No Lighthouse/Core Web Vitals or general platform count/performance claim is made. The historical exact `Object.defineProperty` root cause remains unreproduced.

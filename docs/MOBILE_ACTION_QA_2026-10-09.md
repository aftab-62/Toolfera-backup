# Tool Fera action audit — 9 October 2026

Baseline primary commit: `ae1492a903cac5fcbe78d943e120a67244cbcf54`.

This matrix distinguishes rendered interface checks, actual desktop operations, source-level component reach, automated logic tests, and missing device coverage. It does not label every tool operation or mobile animation as passed.

## Full 46-tool matrix

All desktop interface checks used 1363 × 936 with OS reduced motion reported false. Every listed route rendered its current tool controls; no horizontal overflow was observed. The Download correction reaches 24 tools through one shared component. Only PDF Compressor and QR Generator operations were exercised in this targeted run.

| Tool | Route | Category | Primary action | Desktop animation / operation evidence | Mobile before | Issue found? | Fix applied? | Mobile after | Result |
|---|---|---|---|---|---|---|---|---|---|
| PDF Compressor | `/pdf-tools/pdf-compressor/` | pdf-tools | Compress PDF | Compression / Download operated; intermediate visual sequence partial | Video confirms mismatch on this Sites tool | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PDF Merger | `/pdf-tools/pdf-merger/` | pdf-tools | Merge PDFs | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PDF Splitter | `/pdf-tools/pdf-splitter/` | pdf-tools | Extract pages | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PDF to PNG/JPG | `/pdf-tools/pdf-to-jpg/` | pdf-tools | Convert to images | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PNG/JPG to PDF | `/pdf-tools/jpg-to-pdf/` | pdf-tools | Create PDF | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PDF to Word | `/pdf-tools/pdf-to-word/` | pdf-tools | Convert to Word | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PDF OCR | `/pdf-tools/pdf-ocr/` | pdf-tools | Extract text | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Word to PDF | `/pdf-tools/word-to-pdf/` | pdf-tools | Convert to PDF | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Rotate PDF | `/pdf-tools/rotate-pdf/` | pdf-tools | Rotate pages | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Delete PDF Pages | `/pdf-tools/delete-pdf-pages/` | pdf-tools | Delete pages | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Reorder PDF Pages | `/pdf-tools/reorder-pdf-pages/` | pdf-tools | Reorder pages | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Image Compressor | `/image-tools/image-compressor/` | image-tools | Compress image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Image Resizer | `/image-tools/image-resizer/` | image-tools | Resize image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Image Converter | `/image-tools/image-converter/` | image-tools | Convert image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Image Cropper | `/image-tools/image-cropper/` | image-tools | Crop image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| JPG to PNG | `/image-tools/jpg-to-png/` | image-tools | Convert image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| PNG to JPG | `/image-tools/png-to-jpg/` | image-tools | Convert image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| WebP Converter | `/image-tools/webp-converter/` | image-tools | Convert image | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Image to Text OCR | `/image-tools/image-to-text/` | image-tools | Extract text | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| GPA Calculator | `/student-tools/gpa-calculator/` | student-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| CGPA Calculator | `/student-tools/cgpa-calculator/` | student-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Percentage Calculator | `/student-tools/percentage-calculator/` | student-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Marks Calculator | `/student-tools/marks-calculator/` | student-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Attendance Calculator | `/student-tools/attendance-calculator/` | student-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Fuel Cost Calculator | `/finance-tools/fuel-cost-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| University Merit Calculator | `/student-tools/university-merit-calculator/` | student-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Age Calculator | `/finance-tools/age-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Loan / EMI Calculator | `/finance-tools/loan-emi-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Savings Calculator | `/finance-tools/savings-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Profit Calculator | `/finance-tools/profit-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Discount Calculator | `/finance-tools/discount-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Salary Calculator | `/finance-tools/salary-calculator/` | finance-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Word Counter | `/text-tools/word-counter/` | text-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Character Counter | `/text-tools/character-counter/` | text-tools | Automatic input calculation/count | Automatic intent; no invented primary animation | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Case Converter | `/text-tools/case-converter/` | text-tools | Convert case | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Remove Duplicate Lines | `/text-tools/remove-duplicate-lines/` | text-tools | Remove duplicates | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Text Cleaner | `/text-tools/text-cleaner/` | text-tools | Clean text | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| JSON Formatter | `/developer-tools/json-formatter/` | developer-tools | Format / Minify | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Base64 Encoder / Decoder | `/developer-tools/base64-encoder-decoder/` | developer-tools | Encode / Decode | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| URL Encoder / Decoder | `/developer-tools/url-encoder-decoder/` | developer-tools | Encode / Decode | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| UUID Generator | `/developer-tools/uuid-generator/` | developer-tools | Generate UUIDs | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Color Converter | `/developer-tools/color-converter/` | developer-tools | Convert color | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| QR Code Generator | `/generators/qr-code-generator/` | generators | Generate QR code | Generation and Reset operated; active DOM feedback observed | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Password Generator | `/generators/password-generator/` | generators | Generate password | Desktop UI inspected; operation untested | Unverified on mobile | No reproduced tool-specific issue | None; preserved | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Random Number Generator | `/generators/random-number-generator/` | generators | Generate numbers | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |
| Invoice Generator | `/generators/invoice-generator/` | generators | Create invoice PDF | Desktop UI inspected; operation untested | Unverified on mobile | Shared reduced-motion Download risk | Shared digit-progress fix | Unverified on mobile | Desktop interface PASS; mobile UNVERIFIED |

## Viewport / device matrix

| Environment / width | Actual rendered interaction | Result |
|---|---|---|
| Desktop 1363 × 936 | All 46 interfaces; PDF compression/download; QR generation/reset | Interface checks PASS; selected operations PASS; full visual Download sequence partial |
| Mobile 320 px | Not available | UNVERIFIED |
| Mobile 360 px | Not available | UNVERIFIED |
| Mobile 375 px | Not available | UNVERIFIED |
| Mobile 390 px | Not available | UNVERIFIED |
| Mobile 430 px | Not available | UNVERIFIED |
| Supplied physical-phone recording | Visually inspected; not controlled by this agent | Download digits/progress mismatch confirmed; preference unknown |
| Agent-operated physical Android/iPhone | None | NOT PERFORMED |
| Reduced-motion rendered browser | Emulation unavailable | UNVERIFIED; pure digit/order logic tests PASS |

## Interaction coverage

| Case | Actual evidence | Status |
|---|---|---|
| First / second PDF compression | Two actual browser operations | PASS at desktop only |
| Paper motion | Changing paper positions and captured desktop appearance | PASS at desktop only |
| Download initial / intermediate / final phase | Actual DOM/transform/progress observations | PASS for observed values; full visible sequence partial |
| Browser saved PDF | Two files, 75,813 bytes each, valid PDF and one page | PASS in cloud browser; Android save not tested |
| Retry | Second actual PDF download; repeat-sequence automated test | PASS for those cases |
| QR Generate / Reset | Actual 512 px QR; reset empty input and no download links | PASS at desktop only |
| Missing output / cancellation | Mocked automated tests, no false Done/download | Logic PASS; rendered error interaction not tested |
| New file / reload / scrolling before tap / double tap | No complete current affected-action evidence | UNVERIFIED |
| Background / foreground / mobile keyboard | No physical-device or supported mobile emulation | UNVERIFIED |
| Other distinct processing motion patterns | Controls inspected; no complete operation/frame sequence | UNVERIFIED; protected implementations unchanged |

## Exact repair

The reduced-motion CSS used the final `--y` digit targets as soon as Download became active. With transitions disabled by the OS preference, those columns jumped to 100 while the real JS progress line continued. The candidate supplies `--counter-progress-y` from the existing progress state and uses it only in that reduced-motion rule. Normal Download rules/keyframes, activation ordering and timing are unchanged.

Changed runtime files: `tools/download-action.ts`, `components/site/animated-download-button.tsx`, `components/site/tool-motion.css`. Added test: `scripts/download-action.test.mjs` (five checks passed). TypeScript and one Vercel build passed without subsequent runtime edits. No converter, calculator, OCR, image algorithm, homepage/header/menu/search, SEO/search-engine setup or dependency file changed.

The phone's preference cannot be proven from a recording; this is a confirmed code path, not a claim of complete real-phone acceptance. No new animation was added to instantaneous or automatic tools.

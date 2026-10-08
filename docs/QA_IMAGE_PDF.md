# Tool Fera — image PDF and mobile polish, 4 October 2026

Scope: image-to-PDF encoding, adaptive PDF compressor rendering, and mobile header/category/footer geometry only. Started from published v23, commit `35c99addeeb8e383e8b31c485aff950962d2252e`. No converter, OCR, routing, SEO, search, navigation logic or unrelated tool changes.

## Root causes and implementation

1. The screenshot reports 13.90 MB for two 3.79 MB PNG portraits. The originals are not available; that exact size was not independently reproduced. `pdf-lib` decodes PNG into RGB/alpha streams and deflates RGB without PNG row predictors. Photographic PNGs can therefore expand substantially. There were no duplicate page images in the inspected code.
2. Image-to-PDF now conservatively classifies opaque color photographs for JPEG encoding. Text/UI/graphics and transparent PNGs remain lossless; retained lossless RGB/masks use PNG-style row prediction when it reduces bytes. JPEG inputs are embedded byte-for-byte when appropriately sized and already efficient, or recompressed/downsampled when useful. No new dependency or API.
3. Modes: Best quality 280-DPI ceiling / JPEG 92%; Recommended default 168 / 80%; Smallest file 108 / 62%. Dimensions depend on actual image placement on the PDF page, never exceed source pixels, and preserve proportions within integer pixel rounding. Auto image-size pages retain the existing 96 effective DPI; increasing this would upscale. A4 permits the higher DPI ceilings.
4. The result shows exact input/output bytes and the real smaller/larger percentage; a larger output is explicitly identified. Output is not forced to an arbitrary target size.
5. A 2000×3000 image with the existing 18-point margins makes a 1536×2286-point PDF page. At 96 DPI the entire page canvas becomes 2048×3048 = **6,242,304 pixels**. The failure is caused by physical page size/margins, with ceil rounding relevant at the budget boundary, rather than the original image alone.
6. Compressor-only adaptive rendering now calculates a safe scale before canvas allocation, accounts for ceil rounding, keeps the 6M/page and 60M/total limits, apportions remaining total budget conservatively, and caps scale against source image sampling where PDF operators provide dimensions/transforms. Generic PDF-image export retains its existing strict behavior.
7. Automatic mode continues to protect native text, annotations/forms/links, outlines/attachments and vector content, and additionally checks page structure trees. A notice explains automatic safe resolution adjustment. Larger/equal/negligibly smaller candidates remain withheld; original files remain unchanged.

## Fresh targeted measurements — representative fixtures, NOT original portraits

Two identical synthetic color-texture PNGs: 2000×3000 each, total **17,776,916 bytes**. Legacy pipeline PDF: **30,993,201 bytes**, two pages. These figures must not be substituted for the user's reported 7.58 MB / 13.90 MB case. Native Canvas adapter exercises real encoders and PDF.js rendering, but is not a mobile/Chrome test.

| Page size | Mode | PDF bytes | Embedded image pixels, each page | Effective DPI | JPEG quality |
|---|---|---:|---|---:|---:|
| original | quality | 3,897,465 | 2000×3000 | 96.00 | 92% |
| original | recommended | 1,810,610 | 2000×3000 | 96.00 | 80% |
| original | smallest | 886,510 | 2000×3000 | 96.00 | 62% |
| a4 | quality | 3,897,494 | 2000×3000 | 268.03 | 92% |
| a4 | recommended | 507,852 | 1253×1880 | 167.92 | 80% |
| a4 | smallest | 115,173 | 805×1208 | 107.88 | 62% |

All six outputs contain two pages. Both pages were rendered with Poppler and visually inspected in a comparison sheet. Upright content, blank margins, page aspect ratio and image placement were preserved; stronger JPEG output is softer. Alpha and text-graphic lossless outputs were also rendered and inspected. A UI screenshot retained the lossless path. The high-quality JPEG's embedded DCT stream was compared byte-for-byte with its source.

| Compressor input | Level | Input bytes | Output bytes | Each rendered page | Actual DPI |
|---|---|---:|---:|---|---:|
| legacy | recommended | 30,993,201 | 972,034 | 2008×2988 | 94.10 |
| legacy | strong | 30,993,201 | 491,042 | 2008×2988 | 94.10 |
| original-recommended | recommended | 1,810,610 | 1,017,105 | 2008×2988 | 94.10 |
| original-recommended | strong | 1,810,610 | 515,944 | 2008×2988 | 94.10 |

All four compression outputs parse as two-page PDFs and are genuinely smaller; adaptive notice activated. Both legacy compression outputs were visually inspected page-by-page. The original strict 96-DPI raster path still reproduces the 6M error; the compressor's opt-in safe path avoids it. Recommended keeps higher JPEG quality than Strong even when both are constrained to the same safe page resolution.

## Mobile-only geometry

- Header 65→61px at ≤760px; search/hamburger retain ≥44px. Existing dark gradient/logo/sticky behavior and menu structure are unchanged.
- At ≤639px category cards remove 268px minimum height, use 24px padding, and replace auto/fixed bottom blank space with an 18px gap. Browse control remains ≥44px.
- At ≤639px footer becomes two columns; brand spans both and Legal follows below. Links remain present with ≥44px height. Desktop layout is unchanged.
- Source rules checked for 320/360/375/390/430px; all enter these same media queries. This is **not** an actual mobile viewport rendering test. Horizontal overflow, clipping and reload layout stability on those viewports remain unverified.

## Checks actually performed

- `scripts/verify-image-pdf-optimization.mjs`: six outputs, JPEG byte preservation, alpha mask, lossless text/UI, page-count parsing, adaptive pixel ceilings, exact-6M boundary, legacy failure reproduction, four real raster/compressor outputs, searchable-text protection passed.
- Existing targeted `verify-pdf-compression.mjs`: structural optimization, no-gain/larger output withholding, bounded retry, truthful arithmetic, cancellation and 20/40-file limits passed. No unrelated converter/OCR tests were run.
- `npx tsc --noEmit` passed after the final runtime edits.
- One Sites production build passed. `git diff --check` passed. Production PDF worker is 444,767 uncompressed bytes; no baseline delta is claimed. No dependencies were added; engines remain lazy loaded.
- Native test harness emitted a PDF.js standard-font URL warning during the searchable-text protection fixture; that URL is browser-oriented. It did not prevent the check. This does not establish production console status.

## Remaining limits

Exact portrait PNGs and the user's generated 13.90 MB PDF were not available, so exact-fixture before/after sizes and photographic quality acceptance remain unverified. Photo detection is conservative and heuristic; some photographs can stay lossless. Browsers without worker OffscreenCanvas/createImageBitmap retain originals/lossless encoding, so may obtain less size reduction. No physical-phone, requested-width browser rendering, Lighthouse/Core Web Vitals, saved-file completion or full-platform regression claim is made. This targeted pass does not revalidate historical QA.

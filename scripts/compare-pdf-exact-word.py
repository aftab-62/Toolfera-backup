"""Compare real original-PDF and rendered-DOCX pages; use the primary runtime.
Run after verify-pdf-exact-word.mjs, render_docx.py and original PDF rendering.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from pypdf import PdfReader

root = Path(sys.argv[1])
(root / 'comparisons').mkdir(exist_ok=True)
source_path = root / 'inputs/BudgetMate_FYP_Proposal(1).pdf'
docx_pdf = root / 'docx-render/BudgetMate-Exact-PDF-Layout.pdf'
source, render = PdfReader(source_path), PdfReader(docx_pdf)
assert len(source.pages) == len(render.pages) == 16
rows = []
for n in range(1, 17):
    a = Image.open(root / f'source-render/page-{n:02d}.png').convert('RGB')
    b = Image.open(root / f'docx-render/page-{n}.png').convert('RGB')
    assert a.size == b.size
    aa, bb = np.asarray(a).astype(np.int16), np.asarray(b).astype(np.int16)
    def bounds(arr):
        ys, xs = np.where(np.min(arr, axis=2) < 200)
        return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if xs.size else None
    delta = np.abs(aa - bb)
    source_bounds, word_bounds = bounds(aa), bounds(bb)
    rows.append({'page': n, 'pixelWidth': a.width, 'pixelHeight': a.height,
                 'meanAbsoluteRGBDifference': round(float(delta.mean()), 4),
                 'pixelsAnyChannelDifferenceOver32Percent': round(float(np.any(delta > 32, axis=2).mean() * 100), 4),
                 'sourceInkBounds': source_bounds, 'docxInkBounds': word_bounds})
    pair = Image.new('RGB', (a.width * 2, a.height + 36), '#e5e9f0')
    draw = ImageDraw.Draw(pair)
    draw.text((14, 10), f'PAGE {n} - ORIGINAL PDF', fill='#111827')
    draw.text((a.width + 14, 10), f'PAGE {n} - GENERATED DOCX (LibreOffice render)', fill='#111827')
    pair.paste(a, (0, 36)); pair.paste(b, (a.width, 36))
    pair.save(root / f'comparisons/page-{n:02d}.png')
mixed = PdfReader(root / 'mixed-render/mixed-blank-pages.pdf')
assert len(mixed.pages) == 3
assert [(round(float(p.mediabox.width), 1), round(float(p.mediabox.height), 1)) for p in mixed.pages] == [(300.0, 400.0), (300.0, 400.0), (400.0, 300.0)]
report = {'sourceSHA256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
          'sourcePages': len(source.pages), 'renderedDOCXPages': len(render.pages),
          'comparisonDPI': 150, 'embeddedPageDPI': 300,
          'sourcePageSizes': [[float(p.cropbox.width), float(p.cropbox.height)] for p in source.pages],
          'renderedWordPageSizes': [[float(p.mediabox.width), float(p.mediabox.height)] for p in render.pages],
          'mixedFixtureRenderedPages': len(mixed.pages), 'perPage': rows,
          'note': 'Different PDF.js/Poppler rasterizers and DOCX rendering produce nonzero antialiasing differences. These are measured differences, not a fidelity/accuracy score.'}
(root / 'visual-comparison.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

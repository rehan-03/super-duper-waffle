"""Read-only source reconciliation; retains extracted text and records unresolved visuals."""
from pathlib import Path
import hashlib
import json
import re
import fitz

root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'apps/api/data/curriculum.json').read_text(encoding='utf-8'))
report = {'sources': [], 'issues': [], 'visualReview': 'Targeted visual review only; formulas and diagrams require faculty verification before publication.'}
out = root / '.local/source-audit'
out.mkdir(parents=True, exist_ok=True)
for source in catalog['sources']:
    path = root / 'Syllabus' / source['filename']
    pdf = fitz.open(path)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256']
    assert len(pdf) == source['pages']
    differences = []
    for page, stored in zip(pdf, source['pages_text']):
        # Compare tokens so layout whitespace changes do not hide lost text.
        extracted = re.sub(r'\s+', '', page.get_text())
        reference = re.sub(r'\s+', '', stored['text'])
        if extracted != reference:
            differences.append(page.number + 1)
    report['sources'].append({'filename': source['filename'], 'sha256':source['sha256'], 'pages': len(pdf), 'textDifferencePages': differences})
    pages = [17, 18, 25, 40, 42] if source['filename']=='fy-2023.pdf' else [8, 12, 22, 42, 47, 51, 54] if source['filename']=='sy-2023.pdf' else [2, 3, 10, 14, 56, 57] if 'ty-' in source['filename'] else [2, 7, 29, 34]
    for n in pages:
        pdf[n-1].get_pixmap(matrix=fitz.Matrix(1,1)).save(out / f'{source["filename"]}-{n}.png')
for subject in catalog['subjects']:
    for issue in subject.get('issues', []):
        report['issues'].append({'code':subject['code'], 'source':subject['source_file'], 'pages':[subject['start_page'],subject['end_page']], 'issue':issue})
(root / 'docs/source-reconciliation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'sources':report['sources'], 'sourceIssues':len(report['issues']), 'renderedPages':len(list(out.glob('*.png')))}, ensure_ascii=False))

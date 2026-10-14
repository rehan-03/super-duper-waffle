"""Build conservative source coverage; never turn an unreviewed extraction into completed content."""
from pathlib import Path
import json
import re
import fitz

root=Path(__file__).resolve().parent.parent
catalog=json.loads((root/'apps/api/data/curriculum.json').read_text(encoding='utf-8'))
# Explicit classification, including computing foundation and computing exit alternatives.
reference_only={'2300101A','2300104A','2300105A','2300112A','2300115A','2300102A','2300103A','2300110A','2300116A','2300115B','2300119A','2301209','2300211A','2301218','2301219','2301220','2301407','2301408','2301412','2301413','2301320','2301310','2301409','2301221','2301321'}
documents={s['filename']:fitz.open(root/'Syllabus'/s['filename']) for s in catalog['sources']}
entries=[]
for s in catalog['subjects']:
    computing=s['code'] not in reference_only
    base={'subjectCode':s['code'],'subjectTitle':s['title'],'source':s['source_file'],'year':s['year'],'semester':s['semester'],'pathway':s['pathway'],'issues':s['issues'],'scope':'COMPUTING' if computing else 'REFERENCE'}
    for u in s['units']:
        for pos,text in enumerate(u['topics'],1):
            entries.append({**base,'key':f"source-{s['code'].lower()}-u{u['number']}-p{pos}",'unit':u['number'],'position':pos,'title':u['title'],'sourceText':text,'pages':u['source_pages'],'kind':'THEORY_GROUP','status':'INCOMPLETE' if computing else 'REFERENCE_ONLY','reason':'Original topic-specific authoring and assessment coverage must be completed.' if computing else 'Retained official reference; outside computing content scope.'})
    if s['units']: continue
    # Use actual first-column table rectangles to recover entire numbered assignments,
    # not text order (which can place the number halfway through its description).
    found=[]
    if computing:
        pdf=documents[s['source_file']]
        active=False
        for n in range(s['start_page'],s['end_page']+1):
            page=pdf[n-1]
            text=page.get_text()
            if re.search(r'(List of Laboratory|Laboratory Assignments|Laboratory Experiments)',text,re.I): active=True
            if not active: continue
            rects=[]
            for drawing in page.get_drawings():
                r=drawing['rect']
                if 20<r.width<130 and r.height>12 and r.x0<150 and r.x1<210:
                    label=page.get_textbox(r).strip()
                    if re.fullmatch(r'\d{1,2}[.)]?',label): rects.append((r,label))
            # Prefer the full merged number cell over its inner line cell.
            unique=[]
            for rect,label in sorted(rects,key=lambda v:-v[0].height):
                if not any(abs(rect.y0-r.y0)<1 and abs(rect.y1-r.y1)<1 or (r.y0<=rect.y0 and r.y1>=rect.y1) for r,_ in unique): unique.append((rect,label))
            for rect,label in sorted(unique,key=lambda v:v[0].y0):
                # Ignore course outcomes and evaluation tables above the assignment header.
                above=page.get_textbox(fitz.Rect(0,0,page.rect.width,rect.y0))
                if not found and not re.search(r'(List of Laboratory|Laboratory Assignments|Laboratory Experiments)',above,re.I): continue
                middle=page.get_textbox(fitz.Rect(rect.x1+0.5,rect.y0,page.rect.width-70,rect.y1))
                middle=re.sub(r'\bCO\s*\d(?:\s*[,to]+\s*\d)*\b','',middle)
                middle=re.sub(r'\s+',' ',middle).strip()
                if len(middle)<20: continue
                if 'Course Outcomes' in middle or 'Bloom' in middle: continue
                found.append({'number':label.rstrip('.)'), 'page':n,'text':middle})
    if found:
        for i,a in enumerate(found,1):
            entries.append({**base,'key':f"source-{s['code'].lower()}-lab-{i}",'unit':None,'position':i,'title':f"Assignment {a['number']}: {a['text'][:110]}",'sourceText':a['text'],'pages':[a['page']],'kind':'LAB_ACTIVITY','status':'INCOMPLETE','reason':'Numbered PDF table row extracted. Cross-page continuations and alternative groups require checking against the retained full subject pages before this can be a complete draft.'})
    else:
        source_missing=s['code'] in {'2301222','2301322'}
        entries.append({**base,'key':f"source-{s['code'].lower()}-reference",'unit':None,'position':1,'title':s['title'],'sourceText':'','pages':list(range(s['start_page'],s['end_page']+1)),'kind':'SUBJECT_REFERENCE','status':('SOURCE_BLOCKED' if source_missing else 'INCOMPLETE') if computing else 'REFERENCE_ONLY','reason':('Only scheme-level details supplied; a detailed syllabus is missing.' if source_missing else 'Full source pages exist but activity extraction and topic-specific authoring remain incomplete.') if computing else 'Official reference retained.'})
out={'version':1,'sourcePageCount':sum(s['pages'] for s in catalog['sources']),'entries':entries}
(root/'apps/api/data/coverage.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'entries':len(entries),'computing':sum(e['scope']=='COMPUTING' for e in entries),'labRows':sum(e['kind']=='LAB_ACTIVITY' for e in entries)},ensure_ascii=False))

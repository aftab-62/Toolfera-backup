import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {DOMParser} from '@xmldom/xmldom';

// Private regression files and document extracts remain outside the repository.
const root=resolve(process.argv[2]),stage=process.argv[3]||'pdf-word';
await mkdir(root+'/outputs',{recursive:true});
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const canvas=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMParser,DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
const canvases=[];
globalThis.document={createElement:()=>{
 const c=canvas.createCanvas(1,1),record={widthReset:false,heightReset:false};
 for(const axis of ['width','height']){
  const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c),axis);
  Object.defineProperty(c,axis,{get(){return descriptor.get.call(c)},set(value){record[axis+'Reset']=value===0;descriptor.set.call(c,value)}});
 }
 c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')]));canvases.push(record);return c;
}};
let workers=0;globalThis.Worker=class{constructor(){workers++;throw Error('OCR worker is forbidden')}};
const hash=value=>createHash('sha256').update(value).digest('hex');
const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes=(parent,local)=>[...parent.getElementsByTagNameNS(w,local)];
// Adjacent native items can share one ordinary Word run. Compare paragraph text,
// not PDF item/run boundaries; ignore whitespace normalized for natural editing.
const paragraphTexts=doc=>nodes(doc,'p').map(p=>[...p.childNodes].filter(n=>n.namespaceURI===w&&n.localName==='r'&&!nodes(n,'txbxContent').length).map(run=>nodes(run,'t').map(t=>t.textContent).join('')).join('').replace(/\s/g,'')).filter(Boolean).sort();
const signal=new AbortController().signal;
if(stage==='pdf-word'){
 const {convertPDFToEditableWord}=await import('../tools/pdf-editable-word.ts');
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=resolve('node_modules/pdfjs-dist/build/pdf.worker.mjs');
 const records=[];
 for(const [name,filename] of [['BudgetMate','BudgetMate_FYP_Proposal(2).pdf'],['alcheMe','alcheMe klaviyo flows final.pdf']]){
  const input=await readFile(root+'/fixtures/'+filename),progress=[];
  const result=await convertPDFToEditableWord(new File([input],filename),signal,m=>progress.push(m));
  const bytes=new Uint8Array(await result.blob.arrayBuffer()),parts=unzipSync(bytes);
  const doc=new DOMParser().parseFromString(strFromU8(parts['word/document.xml']),'application/xml');
  const body=nodes(doc,'body')[0],direct=[...body.children];
  assert.equal(result.pages,16);assert.equal(nodes(doc,'sectPr').length,16);assert.equal(workers,0);
  assert.equal(nodes(doc,'txbxContent').length,0,'No normal text may live in floating text boxes');
  assert.equal(nodes(doc,'t').length,nodes(body,'t').length);
  assert.equal(direct.filter(n=>n.localName==='tbl').length,result.summary.tables,'Tables are in the main story');
  const text=nodes(doc,'t').map(t=>t.textContent).join('');
  const media=Object.entries(parts).filter(([key])=>key.startsWith('word/media/')).map(([path,data])=>({path,hash:hash(data)}));
  const before=JSON.parse(await readFile(resolve(root,'../toolfera-paragraph-copy/after/'+name+'-layout.json'),'utf8'));
  const previous=unzipSync(new Uint8Array(await readFile(resolve(root,'../toolfera-paragraph-copy/after/'+name+'-Editable-Word.docx'))));
  const previousDoc=new DOMParser().parseFromString(strFromU8(previous['word/document.xml']),'application/xml');
  assert.deepEqual(paragraphTexts(doc),paragraphTexts(previousDoc),'Paragraph text is neither lost nor duplicated when adjacent runs merge');
  assert.deepEqual(media,before.media,'Localized diagram/logo/Gantt image bytes are unchanged');
  assert.deepEqual(JSON.parse(JSON.stringify(result.layout)),before.layout,'Native layout extraction and graphic/table detection remain unchanged');
  const paragraphs=direct.filter(n=>n.localName==='p'),populated=paragraphs.filter(p=>nodes(p,'t').length);
  assert.equal(populated.length,result.summary.paragraphs);
  assert(populated.every(p=>nodes(p,'txbxContent').length===0));
  assert(paragraphs.some(p=>!nodes(p,'t').length&&!nodes(p,'drawing').length),'Real empty paragraphs provide insertion points');
  const stats={name,inputHash:hash(input),sourcePages:result.pages,sections:nodes(doc,'sectPr').length,
   directBodyParagraphs:paragraphs.length,bodyTextParagraphs:populated.length,
   bodyTextElements:nodes(body,'t').length,textBoxTextElements:0,textBoxes:0,
   textCharacters:text.length,textHash:hash(text),editableTables:direct.filter(n=>n.localName==='tbl').length,
   images:media.length,multiLineBodyParagraphs:populated.filter(p=>nodes(p,'br').length).length,
   emptyBodyParagraphs:paragraphs.filter(p=>!nodes(p,'t').length).length,ocrWorkerCalls:workers};
  await writeFile(root+'/outputs/'+name+'-Editable-Word.docx',bytes);
  await writeFile(root+'/outputs/'+name+'-layout.json',JSON.stringify({stats,layout:result.layout,progress},null,2));
  records.push(stats);console.log(JSON.stringify(stats));
 }
 assert(canvases.every(c=>c.widthReset&&c.heightReset),'Graphic canvases are released');
 await writeFile(root+'/pdf-word-results.json',JSON.stringify({passed:true,records,canvasesReleased:true,ocrWorkerCalls:workers},null,2)+'\n');
}else if(stage==='word-pdf'){
 const {parseDOCX}=await import('../tools/word-docx-parser.ts');
 const {renderWordPDF}=await import('../tools/word-pdf-render.ts');
 const fonts=await Promise.all(['Regular','Bold','Italic','BoldItalic'].map(s=>readFile('public/_word/fonts/LiberationSans-'+s+'.ttf')));
 const records=[];
 for(const [name,path] of [['attached-alcheMe',process.argv[4]],['BudgetMate',root+'/outputs/BudgetMate-Editable-Word.docx'],['alcheMe',root+'/outputs/alcheMe-Editable-Word.docx']]){
  const bytes=await readFile(path),model=await parseDOCX(unzipSync(new Uint8Array(bytes)),signal,()=>{});
  const output=await renderWordPDF(model,fonts,()=>{});
  assert.equal(output.pages,16,name+' must retain 16 pages');
  await writeFile(root+'/outputs/'+name+'-Word-to-PDF.pdf',new Uint8Array(await output.blob.arrayBuffer()));
  const counts={};function count(blocks){for(const b of blocks){counts[b.type]=(counts[b.type]||0)+1;if(b.type==='frame')count(b.blocks)}}count(model.blocks);
  const stats={name,inputHash:hash(bytes),outputPages:output.pages,bytes:output.blob.size,blockCounts:counts,warnings:output.warnings,ocrWorkerCalls:workers};
  records.push(stats);console.log(JSON.stringify(stats));
 }
 assert.equal(workers,0);
 await writeFile(root+'/word-pdf-results.json',JSON.stringify({passed:true,records,ocrWorkerCalls:workers},null,2)+'\n');
}else throw Error('Choose pdf-word or word-pdf');

import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {DOMParser} from '@xmldom/xmldom';

// Targeted real-file regression; private fixtures and extracts stay outside Git.
const root=resolve(process.argv[2]),phase=process.argv[3]||'after';
assert(['before','after'].includes(phase));
await mkdir(root+'/'+phase,{recursive:true});
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const canvas=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
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
const {convertPDFToEditableWord}=await import('../tools/pdf-editable-word.ts');
const pdfjs=await import('pdfjs-dist');
pdfjs.GlobalWorkerOptions.workerSrc=resolve('node_modules/pdfjs-dist/build/pdf.worker.mjs');
const hash=value=>createHash('sha256').update(value).digest('hex');
const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes=(parent,local)=>[...parent.getElementsByTagNameNS(w,local)];
const records=[];
for(const [name,filename] of [['BudgetMate','BudgetMate_FYP_Proposal(2).pdf'],['alcheMe','alcheMe klaviyo flows final.pdf']]){
 const input=await readFile(root+'/fixtures/'+filename),progress=[];
 const result=await convertPDFToEditableWord(new File([input],filename),new AbortController().signal,m=>progress.push(m));
 const bytes=new Uint8Array(await result.blob.arrayBuffer()),parts=unzipSync(bytes),xml=strFromU8(parts['word/document.xml']);
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 const boxes=nodes(doc,'txbxContent');
 const textBoxes=boxes.filter(box=>!nodes(box,'tbl').length);
 const multiline=textBoxes.filter(box=>nodes(box,'br').length);
 assert.equal(result.pages,16);assert.equal(nodes(doc,'sectPr').length,16);assert.equal(workers,0);
 assert.equal(textBoxes.length,result.summary.paragraphs);
 assert(textBoxes.every(box=>nodes(box,'p').length===1),'One paragraph must be one container');
 assert.equal(multiline.length,result.layout.flatMap(p=>p.paragraphs).filter(p=>p.lines.length>1).length);
 const text=nodes(doc,'t').map(t=>t.textContent).join('');
 const plainLines=result.layout.flatMap((page,index)=>page.paragraphs.flatMap(p=>p.lines.map(l=>({page:index+1,...l}))));
 const tables=nodes(doc,'tbl').map(t=>hash(t.toString()));
 const media=Object.entries(parts).filter(([key])=>key.startsWith('word/media/')).map(([path,data])=>({path,hash:hash(data)}));
 const protectedLayout=result.layout.map(({width,height,tables,graphics,rules})=>({width,height,tables,graphics:graphics.map(({bytes,...graphic})=>({...graphic,hash:bytes&&hash(bytes)})),rules}));
 const stats={name,inputHash:hash(input),pages:result.pages,sections:nodes(doc,'sectPr').length,
  paragraphs:textBoxes.length,multilineParagraphs:multiline.length,paragraphLines:plainLines.length,
  maximumParagraphLines:Math.max(...result.layout.flatMap(p=>p.paragraphs.map(p=>p.lines.length))),
  textElements:nodes(doc,'t').length,textCharacters:text.length,textHash:hash(text),tables:tables.length,images:media.length,
  summary:result.summary,ocrWorkerCalls:workers};
 if(phase==='before'){
  const baseline=unzipSync(new Uint8Array(await readFile(root+'/fixtures/'+name+'-Editable-Word.docx')));
  assert.equal(xml,strFromU8(baseline['word/document.xml']),'Saved v16 fixture must match the saved source');
 }else{
  const before=JSON.parse(await readFile(root+'/before/'+name+'-layout.json','utf8'));
  assert.equal(hash(JSON.stringify(plainLines)),before.linesHash,'No source line position/text/style change');
  assert.deepEqual(tables,before.tables,'Editable tables must be byte-for-byte unchanged');
  assert.deepEqual(media,before.media,'Image bytes must be unchanged');
  assert.deepEqual(protectedLayout,before.protectedLayout,'Tables, images, rules and page dimensions must be unchanged');
  assert.equal(stats.textHash,before.stats.textHash,'No text loss or duplication');
  assert(stats.paragraphs<=before.stats.paragraphs,'Paragraph grouping must not add line-level containers');
  if(name==='BudgetMate'){
   assert(stats.paragraphs<before.stats.paragraphs);
   const declaration=result.layout[1].paragraphs.find(p=>Math.abs(p.lines[0].baseline-145.83)<.1);
   assert.equal(declaration.lines.length,6,'The complete Declaration must be one editable paragraph');
   const bullets=result.layout[3].paragraphs.filter(p=>p.lines[0].items.map(t=>t.text).join('').trim().startsWith('•'));
   assert.equal(bullets.length,8,'Distinct list items must remain distinct paragraphs');
   assert(bullets.every(p=>p.lines.length>=2),'Wrapped list text must stay in its own paragraph container');
  }
  // A line break belongs to one logical Word paragraph and the same text-box story.
  for(const box of multiline){
   const paragraph=nodes(box,'p')[0];
   assert(nodes(paragraph,'br').every(br=>br.parentNode.parentNode===paragraph));
   assert(nodes(paragraph,'t').every(t=>t.parentNode.parentNode===paragraph));
  }
 }
 await writeFile(root+'/'+phase+'/'+name+'-Editable-Word.docx',bytes);
 await writeFile(root+'/'+phase+'/'+name+'-layout.json',JSON.stringify({stats,layout:result.layout,
  linesHash:hash(JSON.stringify(plainLines)),tables,media,protectedLayout,progress},null,2));
 records.push(stats);console.log(JSON.stringify(stats));
}
assert(canvases.every(c=>c.widthReset&&c.heightReset),'Graphic canvases must be released');
await writeFile(root+'/'+phase+'/engine-results.json',JSON.stringify({passed:true,phase,records,canvasesReleased:true,ocrWorkerCalls:workers},null,2)+'\n');

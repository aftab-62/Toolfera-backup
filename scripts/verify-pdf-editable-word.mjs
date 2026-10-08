import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {unzipSync,strFromU8} from 'fflate';
const root=resolve(process.argv[2]||'/workspace/scratch/acfb0331f292/toolfera-editable-pdf');
await mkdir(root+'/outputs',{recursive:true});
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json')),canvas=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
const records=[];globalThis.document={createElement:()=>{const c=canvas.createCanvas(1,1),record={widthReset:false,heightReset:false,maxWidth:0,maxHeight:0};for(const axis of ['width','height']){const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c),axis);Object.defineProperty(c,axis,{get(){return descriptor.get.call(c)},set(v){record[axis+'Reset']=v===0;record['max'+axis[0].toUpperCase()+axis.slice(1)]=Math.max(record['max'+axis[0].toUpperCase()+axis.slice(1)],v);descriptor.set.call(c,v)}})}c.toBlob=(cb,type)=>cb(new Blob([c.toBuffer(type)]));records.push(record);return c}};
let workerCalls=0;globalThis.Worker=class{constructor(){workerCalls++;throw Error('OCR worker invocation is forbidden')}};
const engine=await import('../tools/pdf-editable-word.ts'),pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=resolve('node_modules/pdfjs-dist/build/pdf.worker.mjs');
const fixtures=[['BudgetMate','BudgetMate_FYP_Proposal(2).pdf'],['alcheMe','alcheMe klaviyo flows final.pdf']];
const results=[];
for(const [name,input]of fixtures){
 const file=new File([await readFile('/workspace/scratch/acfb0331f292/upload/'+input)],input),signal=new AbortController().signal,progress=[];
 const info=await engine.inspectEditablePDF(file,signal,m=>progress.push(m));assert.equal(info.pages,16);
 const output=await engine.convertPDFToEditableWord(file,signal,m=>progress.push(m));
 assert.equal(output.pages,16);assert.equal(workerCalls,0);
 const bytes=new Uint8Array(await output.blob.arrayBuffer()),parts=unzipSync(bytes),xml=strFromU8(parts['word/document.xml']);
 const textElements=(xml.match(/<w:t(?:\s|>)/g)||[]).length,tables=(xml.match(/<w:tbl>/g)||[]).length,sections=(xml.match(/<w:sectPr>/g)||[]).length;
 assert(textElements>100);assert.equal(sections,16);
 assert.equal(Object.keys(parts).filter(p=>p.startsWith('word/media/')).length,output.summary.images);
 assert(output.layout.every(p=>p.graphics.every(g=>g.width*g.height<p.width*p.height*.75)),'Whole-page image regression');
 await writeFile(root+'/outputs/'+name+'-Editable-Word.docx',bytes);
 const {layout,...metadata}=output;
 const report={name,input,pdfPages:info.pages,docxSections:sections,textElements,tables,images:output.summary.images,docxBytes:bytes.length,ocrWorkerCalls:workerCalls,summary:metadata.summary,progress,layout:layout.map(p=>({width:p.width,height:p.height,paragraphs:p.paragraphs.length,tables:p.tables.map(t=>({x:t.x,y:t.y,width:t.width,height:t.height,rows:t.rows.length,columns:t.columns.length-1,cellTexts:t.rows.map(row=>row.cells.map(c=>c.lines.map(l=>l.items.map(i=>i.text).join('')).join('\n')))})),graphics:p.graphics.map(({bytes,...g})=>g)}))};
 results.push(report);console.log(name,JSON.stringify({pages:info.pages,textElements,tables,images:report.images,bytes:bytes.length}));
}
assert(records.every(r=>r.widthReset&&r.heightReset));
const {PDFDocument,StandardFonts,degrees}=await import('pdf-lib');
async function sample({pages=1,blankSecond=false,scanned=false,rotated=false,width=612}={}){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 for(let n=0;n<pages;n++){
  const page=pdf.addPage([width,792]);
  if(scanned){const c=canvas.createCanvas(500,150),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,500,150);ctx.fillStyle='#000';ctx.font='26px sans-serif';ctx.fillText('Scanned control',20,70);page.drawImage(await pdf.embedPng(c.toBuffer('image/png')),{x:54,y:570,width:500,height:150});c.width=c.height=0;}
  else if(!(blankSecond&&n===1))page.drawText('Native editable control',{x:54,y:700,size:12,font,rotate:rotated?degrees(90):degrees(0)});
 }
 return new File([await pdf.save()],'control.pdf',{type:'application/pdf'});
}
const fresh=()=>new AbortController().signal;
await assert.rejects(async()=>engine.inspectEditablePDF(await sample({scanned:true}),fresh(),()=>{}),/appears to be scanned.*Use OCR/);
await assert.rejects(async()=>engine.inspectEditablePDF(await sample({pages:41}),fresh(),()=>{}),/at most 40 pages/);
await assert.rejects(async()=>engine.inspectEditablePDF(await sample({width:1585}),fresh(),()=>{}),/page size is not supported by Word/);
await assert.rejects(async()=>engine.convertPDFToEditableWord(await sample({rotated:true}),fresh(),()=>{}),/rotated text/);
const cancelled=new AbortController();cancelled.abort();
await assert.rejects(async()=>engine.convertPDFToEditableWord(await sample(),cancelled.signal,()=>{}),{name:'AbortError'});
const blank=await engine.convertPDFToEditableWord(await sample({pages:2,blankSecond:true}),fresh(),()=>{});
assert.equal(blank.pages,2);assert.equal(blank.layout[1].paragraphs.length,0);assert.equal(blank.summary.images,0);
assert.equal((strFromU8(unzipSync(new Uint8Array(await blank.blob.arrayBuffer()))['word/document.xml']).match(/<w:sectPr>/g)||[]).length,2);
assert.equal(workerCalls,0);
const controls={scannedRejected:true,pageLimitRejected:true,oversizedPageRejected:true,rotatedTextRejected:true,preAbortedConversionRejected:true,intentionalBlankPageRetained:true};
await writeFile(root+'/engine-results.json',JSON.stringify({passed:true,results,controls,canvasResetCalls:true,canvases:records,ocrWorkerCalls:workerCalls},null,2)+'\n');
console.log('Controls',JSON.stringify(controls));

import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {unzipSync,strFromU8} from 'fflate';
import {imagePageLayout} from '../tools/image-pdf-layout.ts';
import {reconstructWord} from '../tools/pdf-word-layout.ts';
import {packageDOCX} from '../tools/docx-package.ts';
// Run with the bundled artifact runtime. The canvas adapter exercises the same
// extraction/image-export code without changing its browser implementation.
const fixture=resolve(process.argv[2]||'/workspace/scratch/utilityhub-pdf-qa9');
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const canvas=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D,requestAnimationFrame:callback=>setImmediate(callback)});
globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');const result=canvas.createCanvas(1,1);result.toBlob=(callback,type)=>callback(new Blob([result.toBuffer(type)]));return result}};
if(!Uint8Array.prototype.toHex)Object.defineProperty(Uint8Array.prototype,'toHex',{value(){return Buffer.from(this).toString('hex')}});
const {readWordPDF}=await import('../tools/pdf-to-word.ts');
const pdfjs=await import('pdfjs-dist');
pdfjs.GlobalWorkerOptions.workerSrc=fileURLToPath(new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs',import.meta.url));
const file=async(name,type='application/pdf')=>new File([await readFile(resolve(fixture,name))],name,{type});
const structures=[];
for(const name of ['structured.pdf','paragraphs.pdf']){
 const raw=await readWordPDF(await file(name),new AbortController().signal,()=>{}),model=reconstructWord(raw.pages,raw.warnings),blob=packageDOCX(model),entries=unzipSync(new Uint8Array(await blob.arrayBuffer())),xml=strFromU8(entries['word/document.xml']);
 assert.equal(model.pages.length,name==='structured.pdf'?2:3);assert.match(xml,/<w:pStyle w:val="Heading1"/);assert.match(xml,/<w:t xml:space="preserve">/);assert.equal((xml.match(/<w:sectPr>/g)||[]).length,model.pages.length);
 if(name==='structured.pdf'){assert.ok(model.summary.images>=1,'embedded source image');assert.equal(model.summary.tables,1,'actual aligned table');assert.match(xml,/<w:tbl>/);assert.match(xml,/<w:i\/>/);assert.match(xml,/<w:numPr>/);assert.match(xml,/Second page verification/);assert.ok(Object.keys(entries).some(x=>x.startsWith('word/media/')))}
 else{assert.ok(model.summary.paragraphs>=12);assert.match(xml,/Paragraph 4 on page 3/)}
 await writeFile(resolve(fixture,name.replace('.pdf','.docx')),new Uint8Array(await blob.arrayBuffer()));structures.push({name,...model.summary,warnings:model.warnings});
 if(name==='structured.pdf'){
  // An image placed away from the left margin must still fit the Word page.
  const imageBlock=model.pages[0].blocks.find(b=>b.type==='image');
  imageBlock.x=200;imageBlock.image.width=640;imageBlock.image.height=400;
  const shifted=unzipSync(new Uint8Array(await packageDOCX(model).arrayBuffer()));
  const shiftedXML=strFromU8(shifted['word/document.xml']);
  const paragraph=shiftedXML.match(/<w:p><w:pPr><w:spacing w:before="80"[\s\S]*?<\/w:p>/)[0];
  const indent=Number(paragraph.match(/w:left="(\d+)"/)[1])/20;
  const extent=paragraph.match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
  const width=Number(extent[1])/12700,height=Number(extent[2])/12700;
  assert.ok(indent+width<=model.pages[0].width-model.pages[0].left-model.pages[0].right+.05);
  assert.ok(Math.abs(width/height-1.6)<.001,'inline image keeps its proportions');
 }
}
for(const[name,pattern]of [['invalid.pdf',/invalid|damaged/i],['corrupted.pdf',/invalid|damaged|unsupported/i],['encrypted.pdf',/encrypted|password/i]]){const input=await file(name);await assert.rejects(()=>readWordPDF(input,new AbortController().signal,()=>{}),pattern)}
const scanned=await readWordPDF(await file('scanned.pdf'),new AbortController().signal,()=>{});assert.ok(scanned.scans.length>0,'scan detection offers OCR without an empty Word document');
const fit=imagePageLayout(640,400,{pageSize:'a4',orientation:'portrait',margin:18});assert.equal(fit.width,595.28);assert.equal(fit.height,841.89);assert.equal(fit.drawWidth,559.28);assert.equal(fit.clip,false);
const fill=imagePageLayout(640,400,{pageSize:'a4',orientation:'portrait',margin:18,fit:'fill'});assert.ok(fill.drawWidth>fill.contentWidth);assert.equal(fill.drawHeight,fill.contentHeight);assert.equal(fill.clip,true);
assert.equal(imagePageLayout(200,320,{pageSize:'letter',orientation:'landscape'}).width,792);assert.throws(()=>imagePageLayout(640,400,{fit:'stretch'}));
const messages=[];globalThis.postMessage=value=>messages.push(value);await import('../tools/pdf.worker.ts');
const jpg=await file('landscape.jpg','image/jpeg'),png=await file('portrait.png','image/png');
for(const inputs of [[jpg],[png],[png,jpg,png]]){await globalThis.onmessage({data:{action:'images',files:inputs,margin:0}});const output=messages.at(-1);assert.ok(output.result,'valid image PDF');const pdf=await PDFDocument.load(await output.result.blob.arrayBuffer());assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),inputs.map(f=>f===jpg?[480,300]:[150,240]))}
for(const fit of ['fit','fill']){await globalThis.onmessage({data:{action:'images',files:[jpg],pageSize:'a4',orientation:'portrait',fit,margin:36}});const pdf=await PDFDocument.load(await messages.at(-1).result.blob.arrayBuffer());assert.equal(pdf.getPage(0).getWidth(),595.28);assert.equal(pdf.getPage(0).getHeight(),841.89);await writeFile(resolve(fixture,`${fit}-images.pdf`),new Uint8Array(await messages.at(-1).result.blob.arrayBuffer()))}
const {rasterPDF}=await import('../tools/pdf-raster.ts');pdfjs.GlobalWorkerOptions.workerSrc=fileURLToPath(new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs',import.meta.url));
for(const mime of ['image/png','image/jpeg']){const output=await rasterPDF(await file('structured.pdf'),{pages:'2,1',dpi:96,mime,quality:75,signal:new AbortController().signal,progress:()=>{}});assert.deepEqual(output.files.map(f=>f.name),mime==='image/png'?['page-002.png','page-001.png']:['page-002.jpg','page-001.jpg']);for(const image of output.files){const bytes=new Uint8Array(await image.arrayBuffer());const decoded=await canvas.loadImage(bytes);assert.equal(decoded.width,816);assert.equal(decoded.height,1056);if(mime==='image/png')assert.deepEqual([...bytes.slice(0,4)],[137,80,78,71]);else assert.deepEqual([...bytes.slice(0,3)],[255,216,255])}await globalThis.onmessage({data:{action:'zip',files:output.files}});const entries=unzipSync(new Uint8Array(await messages.at(-1).result.blob.arrayBuffer()));assert.deepEqual(Object.keys(entries),output.files.map(f=>f.name));for(const f of output.files)assert.deepEqual(entries[f.name],new Uint8Array(await f.arrayBuffer()))}
console.log(JSON.stringify({passed:true,structures,checks:['real PNG/JPG exports decode, page order/names, ZIP bytes','JPG-only/PNG-only/mixed reordered PDF page order','fit/fill preserve proportions and page orientation','structured editable DOCX with heading styles, italic runs, image relationships, numbering and a real table','multi-page paragraph-heavy DOCX','scan detection and invalid/corrupt/password errors']},null,2));

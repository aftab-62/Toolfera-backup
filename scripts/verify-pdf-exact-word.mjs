import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {unzipSync,strFromU8} from 'fflate';
import {PDFDocument,StandardFonts} from 'pdf-lib';

const root=resolve(process.argv[3]||'/workspace/scratch/acfb0331f292/toolfera-exact-pdf');
const input=resolve(process.argv[2]||root+'/inputs/BudgetMate_FYP_Proposal(1).pdf');
await mkdir(root+'/outputs',{recursive:true});await mkdir(root+'/rendered-pages',{recursive:true});
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json')),canvas=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
// NAPI resets zero dimensions to a 350x150 fallback; record the zeroing calls
// separately rather than asserting browser dimension semantics in this adapter.
const canvases=[];globalThis.document={createElement:()=>{const c=canvas.createCanvas(1,1),record={canvas:c,widthReset:false,heightReset:false};for(const axis of ['width','height']){const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c),axis);Object.defineProperty(c,axis,{get(){return descriptor.get.call(c)},set(value){record[axis+'Reset']=value===0;descriptor.set.call(c,value)}})}c.toBlob=(callback,type)=>callback(new Blob([c.toBuffer(type)]));canvases.push(record);return c}};
let workerCalls=0;globalThis.Worker=class{constructor(){workerCalls++;throw Error('OCR is forbidden in Exact PDF Layout')}};
const engine=await import('../tools/pdf-exact-word.ts'),pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=resolve('node_modules/pdfjs-dist/build/pdf.worker.mjs');
const file=new File([await readFile(input)],'BudgetMate.pdf'),signal=new AbortController().signal;
const statuses=[],info=await engine.inspectExactWordPDF(file,signal,message=>statuses.push(message));assert.equal(info.pages,16);
const converted=await engine.convertPDFToExactWord(file,signal,message=>statuses.push(message));
assert.equal(converted.pages,16);assert.equal(converted.dpi,300);assert.equal(workerCalls,0);
const bytes=new Uint8Array(await converted.blob.arrayBuffer());await writeFile(root+'/outputs/BudgetMate-Exact-PDF-Layout.docx',bytes);
const parts=unzipSync(bytes),xml=strFromU8(parts['word/document.xml']),images=Object.keys(parts).filter(key=>key.startsWith('word/media/'));
assert.equal(images.length,16);assert.equal((xml.match(/<w:sectPr>/g)||[]).length,16);assert.equal((xml.match(/<wp:anchor /g)||[]).length,16);assert.equal((xml.match(/<w:t[ >]/g)||[]).length,0,'No text reflow layer');
assert.equal((xml.match(/<wp:positionH relativeFrom="page"><wp:posOffset>0<\/wp:posOffset>/g)||[]).length,16);assert.equal((xml.match(/<wp:positionV relativeFrom="page"><wp:posOffset>0<\/wp:posOffset>/g)||[]).length,16);
assert.match(strFromU8(parts['word/settings.xml']),/doNotAutoCompressPictures/);
const sizes=[];for(let n=1;n<=16;n++){const png=parts[`word/media/page-${n}.png`];assert.ok(png);await writeFile(root+`/rendered-pages/page-${n}.png`,png);const image=await canvas.loadImage(png);assert.equal(image.width,2481);assert.equal(image.height,3508);sizes.push({page:n,width:image.width,height:image.height,bytes:png.length})}
assert.ok(canvases.every(c=>c.widthReset&&c.heightReset),'All rendering canvas dimensions reset');
const cancelled=new AbortController();cancelled.abort();await assert.rejects(()=>engine.convertPDFToExactWord(file,cancelled.signal,()=>{}),{name:'AbortError'});
await assert.rejects(()=>engine.inspectExactWordPDF(new File([new Uint8Array(20*1048576+1)],'large.pdf'),signal,()=>{}),/up to 20 MB/);
await assert.rejects(()=>engine.inspectExactWordPDF(new File(['%PDF-1.7\ninvalid'],'invalid.pdf'),signal,()=>{}),/invalid or damaged/);
// Real small fixture for blank pages, mixed page dimensions and PDF rotation.
const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),page=pdf.addPage([300,400]);page.drawText('This position stays on source page one.',{x:25,y:340,size:10,font});pdf.addPage([300,400]);pdf.addPage([400,300]).drawText('Landscape third page.',{x:40,y:200,size:10,font});
const mixedFile=new File([await pdf.save()],'mixed-blank-pages.pdf'),mixed=await engine.convertPDFToExactWord(mixedFile,signal,()=>{});assert.equal(mixed.pages,3);const mixedParts=unzipSync(new Uint8Array(await mixed.blob.arrayBuffer())),mixedXML=strFromU8(mixedParts['word/document.xml']);assert.equal((mixedXML.match(/<w:sectPr>/g)||[]).length,3);assert.match(mixedXML,/w:w="8000" w:h="6000" w:orient="landscape"/);assert.ok(mixedParts['word/media/page-2.png']);await writeFile(root+'/outputs/mixed-blank-pages.docx',new Uint8Array(await mixed.blob.arrayBuffer()));await writeFile(root+'/outputs/mixed-blank-pages.pdf',await pdf.save());
const report={passed:true,source:input,pdfPages:16,docxSections:16,fullPageImages:16,dpi:converted.dpi,docxBytes:bytes.length,sourcePageSize:{width:info.width,height:info.height},imageSizes:sizes,ocrWorkerCalls:workerCalls,textReflowLayer:false,pagePositions:{x:0,y:0},pageImageCompression:'lossless PNG, uncompressed ZIP storage',renderingCanvasResetCalls:canvases.every(c=>c.widthReset&&c.heightReset),validationAndAbort:true,mixedBlankPages:3,progress:statuses};
await writeFile(root+'/render-engine.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

import * as pdfjs from 'pdfjs-dist';
import {readFileBytes,type ReadReporter} from './file-input.ts';
import {packagePDFPages,type RenderedWordPage} from './pdf-page-docx.ts';

const assetBase='/_pdfjs/v5.4.624/';
pdfjs.GlobalWorkerOptions.workerSrc=assetBase+'pdf.worker.min.mjs';
export const EXACT_WORD_DPI=300;
const scale=EXACT_WORD_DPI/72,maxPixels=12000000;
export type ExactWordPDFInfo={pages:number;width:number;height:number};
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError')};
function pageSize(page:pdfjs.PDFPageProxy){
 const viewport=page.getViewport({scale:1});
 if(viewport.width<=0||viewport.height<=0||viewport.width>1584||viewport.height>1584)throw new Error('This PDF page size is not supported by Word. Use pages up to 22 inches per side.');
 if(Math.ceil(viewport.width*scale)*Math.ceil(viewport.height*scale)>maxPixels)throw new Error('This PDF page is too large for safe 300 DPI conversion. Use smaller page dimensions.');
 return viewport;
}
async function withPDF<T>(file:File,signal:AbortSignal,progress:(message:string)=>void,operation:(pdf:pdfjs.PDFDocumentProxy)=>Promise<T>,read?:ReadReporter):Promise<T>{
 check(signal);if(file.size>20*1048576)throw new Error('Choose a PDF up to 20 MB.');progress('Reading PDF…');
 const loading=pdfjs.getDocument({data:new Uint8Array(await readFileBytes(file,signal,read)),isEvalSupported:false,useSystemFonts:true,canvasMaxAreaInBytes:16*1048576,cMapUrl:assetBase+'cmaps/',cMapPacked:true,standardFontDataUrl:assetBase+'standard_fonts/',wasmUrl:assetBase+'wasm/'});
 const cancel=()=>{void loading.destroy().catch(()=>{})};signal.addEventListener('abort',cancel,{once:true});
 try{check(signal);const pdf=await loading.promise;check(signal);if(pdf.numPages>40)throw new Error('Choose a PDF with at most 40 pages for Word conversion.');if(await pdf.getPermissions())throw new Error('Encrypted/password-protected PDFs are unsupported. Use an unencrypted copy.');return await operation(pdf)}
 catch(error){if(signal.aborted)throw new DOMException('Cancelled','AbortError');const e=error as Error;if(/password|encrypt/i.test(e.name+' '+e.message))throw new Error('Encrypted/password-protected PDFs are unsupported. Use an unencrypted copy.');if(e.name==='InvalidPDFException')throw new Error('This PDF is invalid or damaged. Choose a valid PDF.');if(/^(Choose |This |The high-resolution|Unable to render)/.test(e.message))throw e;throw new Error('Unable to convert this PDF. It may be damaged or exceed this device’s rendering resources.',{cause:error})}
 finally{signal.removeEventListener('abort',cancel);await loading.destroy()}
}
export function inspectExactWordPDF(file:File,signal:AbortSignal,progress:(message:string)=>void,read?:ReadReporter):Promise<ExactWordPDFInfo>{
 return withPDF(file,signal,progress,async pdf=>{let first={width:0,height:0};for(let n=1;n<=pdf.numPages;n++){check(signal);progress(`Checking page ${n} of ${pdf.numPages}…`);const page=await pdf.getPage(n);try{const view=pageSize(page);if(n===1)first={width:view.width,height:view.height}}finally{page.cleanup()}}return{pages:pdf.numPages,...first}},read);
}
/** Complete page rendering includes text, vector graphics, charts and annotations.
 * There is deliberately no getTextContent, embedded-image extraction or OCR. */
export function convertPDFToExactWord(file:File,signal:AbortSignal,progress:(message:string)=>void):Promise<{blob:Blob;pages:number;dpi:number}>{
 return withPDF(file,signal,progress,async pdf=>{
  const pages:RenderedWordPage[]=[];let imageBytes=0;
  try{for(let n=1;n<=pdf.numPages;n++){
   check(signal);progress(`Rendering page ${n} of ${pdf.numPages}…`);const page=await pdf.getPage(n),canvas=document.createElement('canvas');
   try{const source=pageSize(page),viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext('2d');if(!context)throw new Error('Unable to render a PDF page on this device.');
    const task=page.render({canvas,canvasContext:context,viewport,background:'#ffffff',annotationMode:pdfjs.AnnotationMode.ENABLE});
    const cancel=()=>task.cancel();signal.addEventListener('abort',cancel,{once:true});task.onContinue=(continuation:()=>void)=>setTimeout(()=>{if(!signal.aborted)continuation()},0);
    try{check(signal);await task.promise}finally{signal.removeEventListener('abort',cancel)}check(signal);
    const image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to render this PDF page as a high-resolution image.')),'image/png'));
    imageBytes+=image.size;if(imageBytes>40*1048576)throw new Error('The high-resolution Word document exceeds 40 MB. Split this PDF into smaller parts.');check(signal);
    pages.push({width:source.width,height:source.height,png:new Uint8Array(await image.arrayBuffer())});
   }finally{canvas.width=canvas.height=0;page.cleanup()}
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  check(signal);progress('Preparing fixed-layout Word pages…');const blob=packagePDFPages(pages,signal);check(signal);return{blob,pages:pdf.numPages,dpi:EXACT_WORD_DPI};
  }finally{pages.length=0}
 });
}

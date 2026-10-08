import {readFileBytes,type ReadReporter} from './file-input.ts';
import * as pdfjs from 'pdfjs-dist';
import {safeRenderScale} from './pdf-safe-render.ts';
import {parsePageSelection} from './pdf-pages.ts';
const assetBase='/_pdfjs/v5.4.624/';
pdfjs.GlobalWorkerOptions.workerSrc=assetBase+'pdf.worker.min.mjs';
/** Automatic page-image compression is limited to plain scans. Text, forms,
 * annotations, outlines and vector drawings retain their original structure. */
export async function canRasterPDF(file:File,signal:AbortSignal,progress:(text:string)=>void){
 const loading=pdfjs.getDocument({data:new Uint8Array(await readFileBytes(file,signal)),isEvalSupported:false,cMapUrl:assetBase+'cmaps/',cMapPacked:true,standardFontDataUrl:assetBase+'standard_fonts/',wasmUrl:assetBase+'wasm/'});
 const abort=()=>void loading.destroy();signal.addEventListener('abort',abort,{once:true});
 try{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');const doc=await loading.promise;
  if(doc.numPages>40)return {allowed:false,limited:true};
  if((await doc.getOutline())?.length||await doc.getAttachments())return {allowed:false};
  const vectorPaint=new Set<number>([pdfjs.OPS.constructPath,pdfjs.OPS.stroke,pdfjs.OPS.closeStroke,pdfjs.OPS.fill,pdfjs.OPS.eoFill,pdfjs.OPS.fillStroke,pdfjs.OPS.eoFillStroke,pdfjs.OPS.shadingFill]);
  const imagePaint=new Set<number>([pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintImageXObjectRepeat]);let hasImages=false;
  for(let index=1;index<=doc.numPages;index++){
   if(signal.aborted)throw new DOMException('Cancelled','AbortError');progress(`Analyzing page ${index} of ${doc.numPages}…`);
   const page=await doc.getPage(index);
   try{
    const text=await page.getTextContent();if(await page.getStructTree())return {allowed:false};if(text.items.some(item=>'str' in item&&item.str.trim())||(await page.getAnnotations()).length)return {allowed:false};
    const operators=await page.getOperatorList();if(operators.fnArray.some(op=>vectorPaint.has(op)))return {allowed:false};hasImages ||= operators.fnArray.some(op=>imagePaint.has(op));
   }finally{page.cleanup()}
  }
  return {allowed:hasImages};
 }finally{signal.removeEventListener('abort',abort);await loading.destroy()}
}
export async function rasterPDF(file:File,{pages,dpi,mime,quality,signal,progress,adaptive=false,noUpscale=false}:{adaptive?:boolean;noUpscale?:boolean;pages?:string;dpi:number;mime:'image/jpeg'|'image/png';quality:number;signal:AbortSignal;progress:(text:string)=>void}){
 const loading=pdfjs.getDocument({data:new Uint8Array(await readFileBytes(file,signal)),isEvalSupported:false,useSystemFonts:true,cMapUrl:assetBase+'cmaps/',cMapPacked:true,standardFontDataUrl:assetBase+'standard_fonts/',wasmUrl:assetBase+'wasm/'});
 let task:ReturnType<pdfjs.PDFPageProxy['render']>|undefined;const abort=()=>{task?.cancel();void loading.destroy()};signal.addEventListener('abort',abort,{once:true});
 try{if(signal.aborted)throw new DOMException('Cancelled','AbortError');const doc=await loading.promise;const indices=pages?.trim()?parsePageSelection(pages,doc.numPages):Array.from({length:doc.numPages},(_,i)=>i);if(indices.length>40)throw new Error('Select at most 40 pages for image rendering.');const files:File[]=[],dimensions:{width:number;height:number}[]=[];let pixels=0,bytes=0,adapted=false;const renderSizes:{width:number;height:number;dpi:number}[]=[];
  for(const index of indices){if(signal.aborted)throw new DOMException('Cancelled','AbortError');progress(`Rendering page ${files.length+1} of ${indices.length}…`);const page=await doc.getPage(index+1),points=page.getViewport({scale:1});let scale=dpi/72;
   if(noUpscale){
    const ops=await page.getOperatorList();let matrix=[1,0,0,1,0,0];const stack:number[][]=[];
    for(let n=0;n<ops.fnArray.length;n++){const op=ops.fnArray[n],args=ops.argsArray[n];
     if(op===pdfjs.OPS.save)stack.push([...matrix]);else if(op===pdfjs.OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];else if(op===pdfjs.OPS.transform)matrix=pdfjs.Util.transform(matrix,args);
     else if(op===pdfjs.OPS.paintImageXObject&&Number(args[1])>0&&Number(args[2])>0){const sx=Math.hypot(matrix[0],matrix[1]),sy=Math.hypot(matrix[2],matrix[3]);if(sx&&sy)scale=Math.min(scale,Number(args[1])/sx,Number(args[2])/sy)}
    }
   }
   if(adaptive){const budget=Math.min(6000000,Math.floor((60000000-pixels)/(indices.length-files.length)));const safe=safeRenderScale(points.width,points.height,scale,budget);if(safe<dpi/72-.000001){adapted=true;progress('Large image-based pages detected. Rendering resolution was automatically optimized for safe compression.')}scale=safe}
   const viewport=page.getViewport({scale}),w=Math.ceil(viewport.width),h=Math.ceil(viewport.height);pixels+=w*h;if(w*h>6000000||pixels>60000000)throw new Error('Use a lower resolution or fewer pages. Limit: 6 million pixels per page and 60 million in total.');renderSizes.push({width:w,height:h,dpi:scale*72});const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas rendering is unavailable in this browser.');
   try{task=page.render({canvas,canvasContext:ctx,viewport,background:'rgb(255,255,255)'});await task.promise;const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to export a rendered page.')),mime,quality/100));bytes+=blob.size;if(bytes>40*1048576)throw new Error('Rendered images exceed 40 MB. Lower the resolution or choose fewer pages.');files.push(new File([blob],`page-${String(index+1).padStart(3,'0')}.${mime==='image/jpeg'?'jpg':'png'}`,{type:mime}));dimensions.push({width:points.width,height:points.height})}finally{task=undefined;canvas.width=canvas.height=0;page.cleanup()}
  }return{files,dimensions,totalPages:doc.numPages,renderSizes,notice:adapted?'Large image-based pages detected. Rendering resolution was automatically optimized for safe compression.':undefined};
 }catch(e){if(e instanceof Error&&/password/i.test(e.name+' '+e.message))throw new Error('Encrypted PDFs are unsupported. Use an unencrypted copy.');throw e}finally{signal.removeEventListener('abort',abort);await loading.destroy()}
}

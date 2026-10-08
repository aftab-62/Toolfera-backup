import {readFileBytes,type ReadReporter} from './file-input.ts';
import * as pdfjs from 'pdfjs-dist';
import type {PDFWordPage,PDFWordText,WordImage} from './pdf-word-layout';
const assetBase='/_pdfjs/v5.4.624/';
pdfjs.GlobalWorkerOptions.workerSrc=assetBase+'pdf.worker.min.mjs';
type FontInfo={name?:string;bold?:boolean;black?:boolean;italic?:boolean};
type ImageInfo={width:number;height:number;kind?:number;data?:Uint8Array|Uint8ClampedArray;bitmap?:ImageBitmap};
const cancelled=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError')};
const yieldFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
function resolveImage(page:pdfjs.PDFPageProxy,id:string,signal:AbortSignal):Promise<ImageInfo>{return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{clean();reject(new Error('An embedded image could not be decoded.'))},5000);
 function clean(){clearTimeout(timer);signal.removeEventListener('abort',abort)}function abort(){clean();reject(new DOMException('Cancelled','AbortError'))}
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return}
 try{(id.startsWith('g_')?page.commonObjs:page.objs).get(id,(image:ImageInfo)=>{clean();resolve(image)})}catch{clean();reject(new Error('An embedded image could not be decoded.'))}
})}
async function pngBytes(image:ImageInfo,signal:AbortSignal,documentWidth:number,documentHeight:number){
 const{width,height,data,bitmap}=image;const scale=Math.min(1,Math.max(1,documentWidth*150/72)/width,Math.max(1,documentHeight*150/72)/height,1600/Math.max(width,height),Math.sqrt(1500000/(width*height)));const outputWidth=Math.max(1,Math.round(width*scale)),outputHeight=Math.max(1,Math.round(height*scale));
 const canvas=document.createElement('canvas');canvas.width=outputWidth;canvas.height=outputHeight;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image reconstruction is unavailable in this browser.');
 try{if(bitmap)ctx.drawImage(bitmap,0,0,outputWidth,outputHeight);else if(data){const rgba=ctx.createImageData(outputWidth,outputHeight);
   for(let row=0;row<outputHeight;row++){cancelled(signal);for(let col=0;col<outputWidth;col++){const sourceRow=Math.min(height-1,Math.floor(row/scale)),sourceCol=Math.min(width-1,Math.floor(col/scale)),pixel=sourceRow*width+sourceCol,index=(row*outputWidth+col)*4;if(image.kind===pdfjs.ImageKind.RGBA_32BPP){rgba.data.set(data.subarray(pixel*4,pixel*4+4),index)}else if(image.kind===pdfjs.ImageKind.RGB_24BPP){rgba.data[index]=data[pixel*3];rgba.data[index+1]=data[pixel*3+1];rgba.data[index+2]=data[pixel*3+2];rgba.data[index+3]=255}else if(image.kind===pdfjs.ImageKind.GRAYSCALE_1BPP){const value=data[sourceRow*Math.ceil(width/8)+(sourceCol>>3)]&(128>>(sourceCol&7))?255:0;rgba.data[index]=rgba.data[index+1]=rgba.data[index+2]=value;rgba.data[index+3]=255}else throw new Error('This embedded image format is unsupported.')}
    if(row%64===0)await yieldFrame();
   }ctx.putImageData(rgba,0,0);
  }else throw new Error('This embedded image format is unsupported.');
  cancelled(signal);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('An image could not be exported.')),'image/png'));return new Uint8Array(await blob.arrayBuffer());
 }finally{canvas.width=canvas.height=0}
}
function fontName(name:string,family:string){const clean=name.replace(/^[A-Z]{6}\+/,'').replace(/[-,](Bold|Italic|Oblique|Regular|Roman).*/i,'');if(/Helvetica|Arial|sans-serif/i.test(clean+' '+family))return'Arial';if(/Times|serif/i.test(clean+' '+family)&&!/sans-serif/i.test(family))return'Times New Roman';if(/Courier|monospace/i.test(clean+' '+family))return'Courier New';return clean.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,64)||'Calibri'}
export async function readWordPDF(file:File,signal:AbortSignal,progress:(message:string)=>void,onPages?:(count:number)=>void,read?:ReadReporter){
 progress('Reading PDF…');const loading=pdfjs.getDocument({data:new Uint8Array(await readFileBytes(file,signal,read)),isEvalSupported:false,canvasMaxAreaInBytes:8*1048576,maxImageSize:40000000,useSystemFonts:true,fontExtraProperties:true,cMapUrl:assetBase+'cmaps/',cMapPacked:true,standardFontDataUrl:assetBase+'standard_fonts/',wasmUrl:assetBase+'wasm/'});
 const abort=()=>{void loading.destroy()};signal.addEventListener('abort',abort,{once:true});
 try{cancelled(signal);const doc=await loading.promise;onPages?.(doc.numPages);if(doc.numPages>40)throw new Error('Choose a PDF with at most 40 pages for Word conversion.');if(await doc.getPermissions())throw new Error('Encrypted/password-protected PDFs are unsupported. Use an unencrypted copy.');
  const pages:PDFWordPage[]=[],warnings:string[]=[],scans:number[]=[];let textCount=0,imageCount=0,imageBytes=0;
  for(let number=1;number<=doc.numPages;number++){cancelled(signal);progress(`Analyzing page ${number} of ${doc.numPages}…`);const page=await doc.getPage(number),viewport=page.getViewport({scale:1});
   try{const content=await page.getTextContent(),operators=await page.getOperatorList();if(operators.fnArray.length>300000)throw new Error('This page is too complex to reconstruct. Convert a simpler PDF.');const items:PDFWordText[]=[];let rotated=0;
    for(const item of content.items){if(!('str'in item)||!item.str.trim())continue;const style=content.styles[item.fontName];const transform=pdfjs.Util.transform(viewport.transform,item.transform),size=Math.hypot(transform[2],transform[3]);if(!Number.isFinite(size)||size<1)continue;if(Math.abs(transform[1])>size*.25)rotated++;
     let font:FontInfo={};try{font=page.commonObjs.get(item.fontName)||{}}catch{/* PDF.js can omit metadata for unusual fonts. */}
     const name=font.name||style?.fontFamily||'Calibri';items.push({text:item.str,x:transform[4],y:transform[5]-size*.8,baseline:transform[5],width:item.width,size,font:fontName(name,style?.fontFamily||''),bold:!!(font.bold||font.black||/bold|black/i.test(name)),italic:!!(font.italic||/italic|oblique/i.test(name)),rtl:item.dir==='rtl'});textCount+=item.str.length;
    }
    if(textCount>200000)throw new Error('This document has too much text. Convert a smaller selection of pages.');if(items.length&&rotated/items.length>.3)throw new Error('This PDF uses extensive rotated text that cannot be reconstructed reliably.');if(rotated)warnings.push('Some rotated text may need manual correction.');
    // Selectable text is always the native conversion source, even on a short
    // cover page. Empty pages are page boundaries, not scans needing OCR.
    const chars=items.map(i=>i.text).join('').replace(/\s/g,'').length;const scanned=chars===0&&operators.fnArray.some(op=>op===pdfjs.OPS.paintImageXObject||op===pdfjs.OPS.paintInlineImageXObject);if(scanned)scans.push(number);
    const images:WordImage[]=[],stack:number[][]=[];let matrix=[1,0,0,1,0,0],painted=0;
    for(let i=0;!scanned&&i<operators.fnArray.length;i++){cancelled(signal);const op=operators.fnArray[i],args=operators.argsArray[i];
     if(op===pdfjs.OPS.save){stack.push([...matrix]);continue}if(op===pdfjs.OPS.restore){matrix=stack.pop()||[1,0,0,1,0,0];continue}if(op===pdfjs.OPS.transform){matrix=pdfjs.Util.transform(matrix,args);continue}
     if(op!==pdfjs.OPS.paintImageXObject&&op!==pdfjs.OPS.paintInlineImageXObject){if([pdfjs.OPS.paintImageMaskXObject,pdfjs.OPS.paintImageXObjectRepeat,pdfjs.OPS.paintInlineImageXObjectGroup].includes(op))warnings.push('Some masked or repeated images could not be reconstructed.');continue}painted++;
     if(++imageCount>25)throw new Error('Choose a PDF with at most 25 embedded images.');
     let image:ImageInfo;try{image=op===pdfjs.OPS.paintImageXObject?await resolveImage(page,args[0],signal):args[0]}catch(e){if(signal.aborted)throw e;warnings.push('An embedded image could not be decoded and was omitted.');continue}
     const t=pdfjs.Util.transform(viewport.transform,matrix),xs=[t[4],t[0]+t[4],t[2]+t[4],t[0]+t[2]+t[4]],ys=[t[5],t[1]+t[5],t[3]+t[5],t[1]+t[3]+t[5]];
     const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);if(width<1||height<1)continue;
     if(image.width>width*150/72||image.height>height*150/72)warnings.push('High-resolution images were reduced to document-sized copies to limit memory.');
     const bytes=await pngBytes(image,signal,width,height);imageBytes+=bytes.length;if(imageBytes>24*1048576)throw new Error('Embedded images exceed 24 MB after resizing. Convert fewer pages.');images.push({bytes,x:Math.max(0,Math.min(...xs)),y:Math.max(0,Math.min(...ys)),width,height});
     if(Math.abs(matrix[1])>.001||Math.abs(matrix[2])>.001)warnings.push('Rotated image placement may differ in Word.');
    }
    pages.push({width:viewport.width,height:viewport.height,text:items,images});await yieldFrame();
   }finally{page.cleanup()}
  }
  return{pages,warnings,scans};
 }catch(e){if(signal.aborted)throw new DOMException('Cancelled','AbortError');const error=e as Error;if(/password|encrypt/i.test(error.name+' '+error.message))throw new Error('Encrypted/password-protected PDFs are unsupported. Use an unencrypted copy.');if(error.name==='InvalidPDFException')throw new Error('This PDF is invalid or damaged. Choose a valid PDF.');if(/^(Choose |This |Pages |Embedded |An image|Image reconstruction)/.test(error.message))throw error;throw new Error('Unable to read this PDF. It may be damaged or use an unsupported structure.',{cause:error});}
 finally{signal.removeEventListener('abort',abort);await loading.destroy()}
}

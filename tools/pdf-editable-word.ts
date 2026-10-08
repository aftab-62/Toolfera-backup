import * as pdfjs from 'pdfjs-dist';
import {readFileBytes,type ReadReporter} from './file-input.ts';
import {editableLayout,type NativePage,type NativeText,type NativeDrawing,type NativeRule,type Bounds,type NativeGraphic} from './pdf-editable-layout.ts';
import {packageEditablePDF} from './pdf-editable-docx.ts';
const assets='/_pdfjs/v5.4.624/';
pdfjs.GlobalWorkerOptions.workerSrc=assets+'pdf.worker.min.mjs';
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError');};
const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
type Font={name?:string;bold?:boolean;black?:boolean;italic?:boolean};
type GraphicsState={matrix:number[];fill:string;stroke:string;lineWidth:number};
const color=(value:unknown)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value.slice(1).toUpperCase():'000000';
const normal=(text:string)=>text.normalize('NFKC').replace(/\s/g,'');
function fontFamily(name:string,family:string){
 const clean=name.replace(/^[A-Z]{6}\+/,'');
 // The native PostScript name takes priority: PDF.js can classify embedded
 // Nimbus Roman fonts as generic sans-serif even though they are serif fonts.
 if(/NimbusRom|Times|LiberationSerif/i.test(clean))return'Times New Roman';
 if(/serif/i.test(family)&&!/sans-serif/i.test(family))return'Times New Roman';
 if(/Courier|Mono/i.test(clean+' '+family))return'Courier New';
 if(/Sans|Arial|Helvetica|sans-serif/i.test(clean+' '+family))return'Arial';
 return clean.replace(/[-,](Bold|Italic|Oblique|Regular).*/i,'').replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,64)||'Calibri';
}
const apply=(point:number[],matrix:number[])=>[point[0]*matrix[0]+point[1]*matrix[2]+matrix[4],point[0]*matrix[1]+point[1]*matrix[3]+matrix[5]];
function bounds(matrix:number[],box:ArrayLike<number>):Bounds{
 const points=[[box[0],box[1]],[box[0],box[3]],[box[2],box[1]],[box[2],box[3]]].map(point=>apply(point,matrix));
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
function pathBounds(data:ArrayLike<number>){
 const xs:number[]=[],ys:number[]=[];
 for(let k=0;k<data.length;){const op=data[k++],pairs=op===0||op===1?1:op===2?3:op===3?2:0;for(let i=0;i<pairs;i++){xs.push(data[k++]);ys.push(data[k++]);}if(!pairs&&op!==4)break;}
 return xs.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]:null;
}
function drawings(operators:Awaited<ReturnType<pdfjs.PDFPageProxy['getOperatorList']>>,viewport:pdfjs.PageViewport){
 const stack:GraphicsState[]=[],paths:NativeDrawing[]=[],pictures:NativeGraphic[]=[],glyphs:{text:string;color:string}[]=[];
 let state:GraphicsState={matrix:[1,0,0,1,0,0],fill:'000000',stroke:'000000',lineWidth:1};
 for(let i=0;i<operators.fnArray.length;i++){
  const op=operators.fnArray[i],args=operators.argsArray[i];
  if(op===pdfjs.OPS.save||op===pdfjs.OPS.paintFormXObjectBegin){stack.push({...state,matrix:[...state.matrix]});if(op===pdfjs.OPS.paintFormXObjectBegin&&args[0])state.matrix=pdfjs.Util.transform(state.matrix,args[0]);continue;}
  if(op===pdfjs.OPS.restore||op===pdfjs.OPS.paintFormXObjectEnd){state=stack.pop()||state;continue;}
  if(op===pdfjs.OPS.transform){state.matrix=pdfjs.Util.transform(state.matrix,args);continue;}
  if(op===pdfjs.OPS.setFillRGBColor){state.fill=color(args[0]);continue;}
  if(op===pdfjs.OPS.setStrokeRGBColor){state.stroke=color(args[0]);continue;}
  if(op===pdfjs.OPS.setLineWidth){state.lineWidth=args[0];continue;}
  if(op===pdfjs.OPS.showText){for(const glyph of args[0])if(typeof glyph==='object'&&glyph?.unicode)for(const char of normal(glyph.unicode))glyphs.push({text:char,color:state.fill});continue;}
  const matrix=pdfjs.Util.transform(viewport.transform,state.matrix);
  if([pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintImageMaskXObject].includes(op)){
   const b=bounds(matrix,[0,0,1,1]);if(b.width>1&&b.height>1)pictures.push({...b,kind:'image'});continue;
  }
  if(op!==pdfjs.OPS.constructPath)continue;
  const data:ArrayLike<number>=args[1]?.[0]||[],localBounds=args[2]||pathBounds(data);if(!localBounds)continue;
  const b=bounds(matrix,localBounds);if(!Object.values(b).every(Number.isFinite))continue;
  const rules:NativeRule[]=[],paint=args[0];let point:number[]|null=null,first:number[]|null=null,curved=false;
  function line(next:number[]){if(point){const a=apply(point,matrix),z=apply(next,matrix);if(Math.abs(a[0]-z[0])<.6||Math.abs(a[1]-z[1])<.6)rules.push({x1:a[0],y1:a[1],x2:z[0],y2:z[1],width:Math.max(.2,state.lineWidth*Math.hypot(matrix[0],matrix[1])),color:state.stroke});}point=next;}
  for(let k=0;k<data.length;){const type=data[k++];if(type===0){point=[data[k++],data[k++]];first=point;}else if(type===1)line([data[k++],data[k++]]);else if(type===2){curved=true;k+=4;point=[data[k++],data[k++]];}else if(type===3){curved=true;k+=2;point=[data[k++],data[k++]];}else if(type===4&&first)line(first);else break;}
  const filled=[pdfjs.OPS.fill,pdfjs.OPS.eoFill,pdfjs.OPS.fillStroke,pdfjs.OPS.eoFillStroke].includes(paint);
  if(filled&&b.height<2.5&&b.width>8){rules.splice(0,rules.length,{x1:b.x,y1:b.y+b.height/2,x2:b.x+b.width,y2:b.y+b.height/2,width:Math.max(.2,b.height),color:state.fill});}
  const nonNeutral=filled&&!['000000','FFFFFF','222222'].includes(state.fill)&&b.width>5&&b.height>5;
  paths.push({...b,complex:curved||nonNeutral,rules});
 }
 return{paths,pictures,glyphs};
}
async function openPDF(file:File,signal:AbortSignal,read?:ReadReporter){
 if(file.size>20*1048576)throw new Error('Choose a PDF up to 20 MB.');check(signal);
 return pdfjs.getDocument({data:new Uint8Array(await readFileBytes(file,signal,read)),isEvalSupported:false,useSystemFonts:true,fontExtraProperties:true,canvasMaxAreaInBytes:8*1048576,maxImageSize:40000000,cMapUrl:assets+'cmaps/',cMapPacked:true,standardFontDataUrl:assets+'standard_fonts/',wasmUrl:assets+'wasm/'});
}
async function withPDF<T>(file:File,signal:AbortSignal,read:ReadReporter|undefined,operation:(pdf:pdfjs.PDFDocumentProxy)=>Promise<T>){
 const task=await openPDF(file,signal,read),abort=()=>{void task.destroy();};signal.addEventListener('abort',abort,{once:true});
 try{check(signal);const pdf=await task.promise;if(pdf.numPages>40)throw new Error('Choose a PDF with at most 40 pages.');if(await pdf.getPermissions())throw new Error('Encrypted/password-protected PDFs are unsupported. Use an unencrypted copy.');return await operation(pdf);}
 catch(value){if(signal.aborted)throw new DOMException('Cancelled','AbortError');const error=value as Error;if(/password|encrypt/i.test(error.name+' '+error.message))throw new Error('Encrypted/password-protected PDFs are unsupported. Use an unencrypted copy.');if(error.name==='InvalidPDFException')throw new Error('This PDF is invalid or damaged. Choose a valid PDF.');if(/^(Choose |This |The |Scanned |Encrypted|Unable to render)/.test(error.message))throw error;throw new Error('Unable to convert this PDF. It may be damaged or use an unsupported structure.',{cause:error});}
 finally{signal.removeEventListener('abort',abort);await task.destroy();}
}
const scannedMessage='This PDF appears to be scanned. Use OCR to extract editable text.';
export async function inspectEditablePDF(file:File,signal:AbortSignal,progress:(message:string)=>void,read?:ReadReporter){
 progress('Reading PDF…');return withPDF(file,signal,read,async pdf=>{let characters=0;
  for(let number=1;number<=pdf.numPages;number++){check(signal);progress(`Checking page ${number} of ${pdf.numPages}…`);const page=await pdf.getPage(number);try{
   const viewport=page.getViewport({scale:1});if(viewport.width>1584||viewport.height>1584)throw new Error('This PDF page size is not supported by Word. Use pages up to 22 inches per side.');
   const content=await page.getTextContent();const count=content.items.reduce((n,item)=>n+('str'in item?item.str.trim().length:0),0);characters+=count;
   if(!count){const ops=await page.getOperatorList();if(ops.fnArray.some(op=>op===pdfjs.OPS.paintImageXObject||op===pdfjs.OPS.paintInlineImageXObject))throw new Error(scannedMessage);}
   if(characters>200000)throw new Error('This document has too much text. Convert a smaller selection of pages.');
  }finally{page.cleanup();}await pause();}
  if(!characters)throw new Error(scannedMessage);return{pages:pdf.numPages,characters};
 });
}
async function cropGraphic(page:pdfjs.PDFPageProxy,graphic:NativeGraphic,signal:AbortSignal){
 const scale=300/72,width=Math.max(1,Math.ceil(graphic.width*scale)),height=Math.max(1,Math.ceil(graphic.height*scale));
 if(width*height>12000000)throw new Error('This graphic is too large to render safely. Convert a smaller page selection.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)throw new Error('Unable to render graphics in this browser.');
 const render=page.render({canvas,canvasContext:context,viewport:page.getViewport({scale}),transform:[1,0,0,1,-graphic.x*scale,-graphic.y*scale],background:'#FFFFFF',annotationMode:pdfjs.AnnotationMode.ENABLE});
 const abort=()=>render.cancel();signal.addEventListener('abort',abort,{once:true});render.onContinue=(continueRender:()=>void)=>{setTimeout(()=>{if(signal.aborted)render.cancel();else continueRender();},0);};
 try{check(signal);await render.promise;check(signal);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Unable to render this PDF graphic.')),'image/png'));return new Uint8Array(await blob.arrayBuffer());}
 finally{signal.removeEventListener('abort',abort);canvas.width=canvas.height=0;}
}
export async function convertPDFToEditableWord(file:File,signal:AbortSignal,progress:(message:string)=>void){
 progress('Reading PDF…');return withPDF(file,signal,undefined,async pdf=>{
  const pages:ReturnType<typeof editableLayout>[]=[],warnings=new Set<string>();let textCount=0,imageBytes=0;
  for(let number=1;number<=pdf.numPages;number++){check(signal);progress(`Reconstructing page ${number} of ${pdf.numPages}…`);const page=await pdf.getPage(number);
   try{
    const viewport=page.getViewport({scale:1});if(viewport.width>1584||viewport.height>1584)throw new Error('This PDF page size is not supported by Word. Use pages up to 22 inches per side.');
    const content=await page.getTextContent(),operators=await page.getOperatorList();if(operators.fnArray.length>300000)throw new Error('This page is too complex to reconstruct safely.');
    const objects=drawings(operators,viewport),native:NativeText[]=[];const stream=objects.glyphs.map(g=>g.text).join('');let cursor=0;
    for(const item of content.items){if(!('str'in item)||!item.str)continue;
     const transform=pdfjs.Util.transform(viewport.transform,item.transform),size=Math.hypot(transform[2],transform[3]);if(!Number.isFinite(size)||size<1)continue;
     if(Math.abs(transform[1])>size*.25)throw new Error('This PDF contains rotated text that cannot yet be converted reliably into editable Word text.');
     const style=content.styles[item.fontName];let font:Font={};try{font=page.commonObjs.get(item.fontName)||{};}catch{/* Some fonts omit metadata. */}
     const name=font.name||style?.fontFamily||'Calibri',plain=normal(item.str),position=plain?stream.indexOf(plain,cursor):cursor;
     const fill=position>=0?objects.glyphs[position]?.color||'000000':'000000';if(position>=0&&plain)cursor=position+plain.length;
     native.push({text:item.str,x:transform[4],baseline:transform[5],width:item.width,size,font:fontFamily(name,style?.fontFamily||''),bold:!!(font.bold||font.black||/bold|black|(?:-|\+)medi\b/i.test(name)),italic:!!(font.italic||/italic|oblique/i.test(name)),color:fill,rtl:item.dir==='rtl'});textCount+=item.str.length;
    }
    if(textCount>200000)throw new Error('This document has too much text. Convert a smaller selection of pages.');
    if(!native.some(i=>i.text.trim())&&objects.pictures.length)throw new Error(scannedMessage);
    if(objects.pictures.some(g=>g.width*g.height>viewport.width*viewport.height*.75))throw new Error(scannedMessage);
    const model:NativePage={width:viewport.width,height:viewport.height,text:native,drawings:objects.paths,graphics:objects.pictures};
    const layout=editableLayout(model);
    for(const graphic of layout.graphics){check(signal);progress(`Preserving graphics on page ${number} of ${pdf.numPages}…`);graphic.bytes=await cropGraphic(page,graphic,signal);imageBytes+=graphic.bytes.length;if(imageBytes>32*1048576)throw new Error('This document contains too much graphic data. Convert fewer pages.');}
    pages.push(layout);
   }finally{page.cleanup();}await pause();
  }
  if(!textCount)throw new Error(scannedMessage);check(signal);progress('Preparing editable Word document…');
  const blob=packageEditablePDF(pages,signal);return{blob,pages:pages.length,warnings:[...warnings],summary:{pages:pages.length,paragraphs:pages.reduce((n,p)=>n+p.paragraphs.length,0),tables:pages.reduce((n,p)=>n+p.tables.length,0),images:pages.reduce((n,p)=>n+p.graphics.length,0),nativeCharacters:textCount},layout:pages};
 });
}

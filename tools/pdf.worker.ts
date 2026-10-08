import {PDFDocument,PDFRawStream,PDFName,degrees,pushGraphicsState,popGraphicsState,rectangle,clip,endPath} from 'pdf-lib';
import {zipSync,zlibSync} from 'fflate';
import {parsePageSelection} from './pdf-pages.ts';
import {imagePageLayout} from './image-pdf-layout.ts';
import {inspectImageHeader} from './image-input.ts';
import {optimizedPDFImage,type ImagePDFStats} from './pdf-image-optimization.ts';
import {friendlyFileError} from './file-input.ts';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(data:unknown)=>void};
type InputFile=File|{name:string;size:number;type:string;bytes:Uint8Array};
async function inputBytes(file:InputFile){const bytes=(file as {bytes?:unknown}).bytes;return bytes instanceof Uint8Array?bytes:new Uint8Array(await (file as File).arrayBuffer())}
async function read(file:InputFile){const doc=await PDFDocument.load(await inputBytes(file),{updateMetadata:false});if(doc.getPageCount()>500)throw new Error('This tool supports up to 500 pages per PDF.');return doc}
function safeError(error:unknown){return friendlyFileError(error,'Unable to process this file. It may be damaged or unsupported. Try a valid unencrypted PDF or supported image.')}
scope.onmessage=async({data})=>{const {id,action,files=[],pages,angle=90,pageSize='original',orientation='auto',fit='fit',margin=18,optimization='recommended',dimensions:pageDimensions}=data;try{
 const progress=(message:string)=>scope.postMessage({id,progress:message});
 const done=async(doc:PDFDocument,imageStats?:ImagePDFStats[])=>{doc.setProducer('Tool Fera · pdf-lib');const bytes=await doc.save({useObjectStreams:true,updateFieldAppearances:false});scope.postMessage({id,result:{blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/pdf'}),pages:doc.getPageCount(),imageStats}})};
 if(action==='zip'){if(files.length>40||files.reduce((n:number,f:File)=>n+f.size,0)>40*1048576)throw new Error('Maximum image output: 40 files and 40 MB.');const entries:Record<string,Uint8Array>={};for(const f of files)entries[f.name]=await inputBytes(f);const bytes=zipSync(entries,{level:0});scope.postMessage({id,result:{blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/zip'}),pages:files.length}});return}
 if(action==='inspect'){const counts=[];for(const f of files){counts.push((await read(f)).getPageCount());progress(`Checked ${counts.length} of ${files.length} documents`)}scope.postMessage({id,result:{counts}});return}
 if(action==='images'||action==='inspect-images'||action==='compress-images'){
  const imageLimit=action==='compress-images'?40:20;
  if(!files.length||files.length>imageLimit)throw new Error(`Choose between 1 and ${imageLimit} images.`);const out=await PDFDocument.create(),sizes=[];let totalPixels=0;
  const imageStats:ImagePDFStats[]=[];
  for(let i=0;i<files.length;i++){
   const bytes=await inputBytes(files[i]),header=inspectImageHeader(bytes,20000000);
   if(!['image/png','image/jpeg'].includes(header.mime))throw new Error('Unsupported image. Choose a JPG or PNG file.');
   totalPixels+=header.width*header.height;if(totalPixels>60000000)throw new Error('Maximum total image resolution is 60 million pixels.');sizes.push({width:header.width,height:header.height});
   if(action!=='inspect-images'){
    const layout=imagePageLayout(header.width,header.height,{pageSize,orientation,fit,margin:Number(margin),dimensions:pageDimensions?.[i]});
    const optimized=action==='images'?await optimizedPDFImage(out,bytes,header,layout.drawWidth,layout.drawHeight,optimization):null;
    const image=optimized?.image||(header.mime==='image/png'?await out.embedPng(bytes):await out.embedJpg(bytes));if(optimized)imageStats.push(optimized.stats);
    const p=out.addPage([layout.width,layout.height]);if(layout.clip)p.pushOperators(pushGraphicsState(),rectangle(layout.pad,layout.pad,layout.contentWidth,layout.contentHeight),clip(),endPath());p.drawImage(image,{x:layout.x,y:layout.y,width:layout.drawWidth,height:layout.drawHeight});if(layout.clip)p.pushOperators(popGraphicsState());
   }progress(`Prepared image ${i+1} of ${files.length}`);
  }if(action==='inspect-images')scope.postMessage({id,result:{sizes}});else await done(out,imageStats);return;
 }
 if(action==='compress'){
  const doc=await read(files[0]);progress('Optimizing PDF data…');
  // Saving with object streams alone leaves existing page/font streams intact.
  // Losslessly deflate only unfiltered data; existing filter chains are kept.
  for(const [ref,object] of doc.context.enumerateIndirectObjects()){
   if(!(object instanceof PDFRawStream)||object.dict.has(PDFName.of('Filter')))continue;
   const bytes=object.getContents();if(bytes.length<128)continue;
   const compressed=zlibSync(bytes,{level:9});if(compressed.length>=bytes.length)continue;
   const dictionary=object.dict.clone();dictionary.set(PDFName.of('Filter'),PDFName.of('FlateDecode'));
   doc.context.assign(ref,PDFRawStream.of(dictionary,compressed));
  }
  await done(doc);return
 }
 if(action==='rotate'){const doc=await read(files[0]);const selected=parsePageSelection(pages,doc.getPageCount());if(![90,180,270].includes(Number(angle)))throw new Error('Choose a rotation of 90, 180 or 270 degrees.');for(const i of selected)doc.getPage(i).setRotation(degrees((doc.getPage(i).getRotation().angle+Number(angle))%360));progress(`Rotated ${selected.length} pages`);await done(doc);return}
 if(!['merge','split','delete','reorder'].includes(action))throw new Error('Choose a supported PDF operation.');
 const output=await PDFDocument.create();let count=0;
 for(const file of files){const source=await read(file);let indices=source.getPageIndices();if(['split','delete','reorder'].includes(action)){const selection=parsePageSelection(pages,source.getPageCount());if(action==='delete'){indices=indices.filter(i=>!selection.includes(i));if(!indices.length)throw new Error('Deleting every page would create an empty PDF. Keep at least one page.')}else{indices=selection;if(action==='reorder'&&indices.length!==source.getPageCount())throw new Error('Reordering requires every page exactly once.')}}if(count+indices.length>500)throw new Error('The combined output is limited to 500 pages.');const copied=await output.copyPages(source,indices);copied.forEach(p=>output.addPage(p));count+=copied.length;progress(`Copied ${count} pages`)}
 if(!count)throw new Error('The output needs at least one page.');await done(output);
 }catch(error){scope.postMessage({id,error:safeError(error)})}};

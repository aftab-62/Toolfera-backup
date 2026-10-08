import {friendlyFileError} from './file-input.ts';
import {inspectImageHeader} from './image-input.ts';
import {dimensions,validateCrop,encodeBMP,type ImageSettings,type ProcessedImage} from './image-processing.ts';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(data:unknown)=>void};
let bitmap:ImageBitmap|undefined;
async function capabilities(){
 const supported=['image/bmp'];
 if(typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')throw new Error('This browser needs the compatibility processor.');
 const canvas=new OffscreenCanvas(1,1);canvas.getContext('2d');
 for(const mime of ['image/jpeg','image/png','image/webp','image/avif']){try{const blob=await canvas.convertToBlob({type:mime});if(blob.type===mime)supported.push(mime)}catch{}}
 return supported;
}
async function process(settings:ImageSettings):Promise<ProcessedImage>{
 if(!bitmap)throw new Error('Choose an image first.');
 const d=dimensions(bitmap.width,bitmap.height,settings.width,settings.height,settings.mode),canvas=new OffscreenCanvas(d.width,d.height),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Unable to start image processing.');
 if(['image/jpeg','image/bmp'].includes(settings.mime)){ctx.fillStyle='#fff';ctx.fillRect(0,0,d.width,d.height)}
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(settings.crop){const c=validateCrop(bitmap.width,bitmap.height,settings.crop);ctx.drawImage(bitmap,c.x,c.y,c.width,c.height,0,0,d.width,d.height)}else {ctx.drawImage(bitmap,(d.width-d.drawWidth)/2,(d.height-d.drawHeight)/2,d.drawWidth,d.drawHeight);}
 const blob=settings.mime==='image/bmp'?encodeBMP(ctx.getImageData(0,0,d.width,d.height).data,d.width,d.height):await canvas.convertToBlob({type:settings.mime,quality:settings.quality/100});
 if(blob.type!==settings.mime)throw new Error('This browser cannot export the selected format. Choose another format.');
 return {blob,bytes:blob.size,width:d.width,height:d.height,mime:blob.type};
}
scope.onmessage=async ({data})=>{const {id,action,file,settings}=data;try{
 let result:unknown;
 if(action==='capabilities')result=await capabilities();
 else if(action==='inspect'){bitmap?.close();bitmap=undefined;const bytes=data.bytes as Uint8Array|undefined;if(bytes)inspectImageHeader(bytes);const source=bytes?new Blob([bytes as Uint8Array<ArrayBuffer>],{type:data.mime}):file;const decoded=await createImageBitmap(source);if(decoded.width*decoded.height>40000000){decoded.close();throw new Error('Choose an image with at most 40 million pixels.')}bitmap=decoded;result={width:bitmap.width,height:bitmap.height,bytes:data.size??file.size,mime:data.mime??file.type};}
 else if(action==='process')result=await process(settings);
 else if(action==='reset'){bitmap?.close();bitmap=undefined;result=true;}
 scope.postMessage({id,result});
 }catch(error){scope.postMessage({id,error:friendlyFileError(error,'This image could not be read or processed. Choose a valid, supported image.')})}};

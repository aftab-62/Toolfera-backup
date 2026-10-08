import {readFileBytes,type ReadReporter} from './file-input';
import {inspectImageHeader} from './image-input';
import type {ImageMetadata,ImageSettings,ProcessedImage} from './image-processing';
export interface ImageProcessor{formats:string[];compatibility:boolean;inspect:(file:File,read?:ReadReporter)=>Promise<ImageMetadata>;process:(settings:ImageSettings)=>Promise<ProcessedImage>;dispose:()=>void}
export async function createImageProcessor():Promise<ImageProcessor>{
 let worker:Worker|undefined;
 try{
  worker=new Worker(new URL('./image.worker.ts',import.meta.url),{type:'module'});
  let next=0,disposed=false,failed=false;const pending=new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void}>();
  const request=<T>(action:string,payload:Record<string,unknown>={},transfer:Transferable[]=[])=>new Promise<T>((resolve,reject)=>{if(disposed||failed){reject(new Error('Unable to start image processing. Reset the tool and choose your image again.'));return}const id=++next;pending.set(id,{resolve:value=>resolve(value as T),reject});try{worker!.postMessage({id,action,...payload},transfer)}catch{pending.delete(id);reject(new Error('Unable to prepare this image. Reset and try a smaller file.'))}});
  worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);if(data.error)p.reject(new Error(data.error));else p.resolve(data.result)};
  worker.onerror=worker.onmessageerror=()=>{failed=true;for(const p of pending.values())p.reject(new Error('Image worker failed. Reload the tool to try again.'));pending.clear()};
  let timer:ReturnType<typeof setTimeout>|undefined;let formats:string[];try{formats=await Promise.race([request<string[]>('capabilities'),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Image worker unavailable.')),8000)})])}finally{clearTimeout(timer)}
  return {formats,compatibility:false,inspect:async(file,read)=>{const bytes=new Uint8Array(await readFileBytes(file,undefined,read));const header=inspectImageHeader(bytes);return request<ImageMetadata>('inspect',{bytes,mime:header.mime,size:file.size},[bytes.buffer])},process:settings=>request('process',{settings}),dispose:()=>{disposed=true;worker?.terminate();for(const p of pending.values())p.reject(new Error('Processing cancelled.'));pending.clear()}};
 }catch{worker?.terminate();const {createCompatibilityProcessor}=await import('./image-fallback');return createCompatibilityProcessor()}
}

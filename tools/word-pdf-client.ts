import type {WordPDFModel} from './word-pdf-model';
import {readFileBytes,type ReadReporter} from './file-input';
function run<T>(input:object,signal:AbortSignal,progress:(message:string)=>void,transfer:Transferable[]=[]){return new Promise<T>((resolve,reject)=>{
 let worker:Worker;try{worker=new Worker(new URL('./word-pdf.worker.ts',import.meta.url),{type:'module'})}catch{reject(new Error('Unable to start Word conversion. Use a recent browser and reload this tool.'));return}let settled=false;
 const clean=()=>{worker.terminate();signal.removeEventListener('abort',abort)};
 const abort=()=>{if(settled)return;settled=true;clean();reject(new DOMException('Cancelled','AbortError'))};
 const fail=()=>{if(settled)return;settled=true;clean();reject(new Error('The Word conversion worker stopped. Try a smaller document.'))};
 if(signal.aborted){abort();return}signal.addEventListener('abort',abort,{once:true});
 worker.onmessage=({data})=>{if(settled)return;if(data.progress){progress(data.progress);return}settled=true;clean();if(data.error)reject(new Error(data.error));else resolve(data.result)};
 worker.onerror=worker.onmessageerror=fail;try{worker.postMessage(input,transfer)}catch{fail()}
 })}
export async function readDOCX(file:File,signal:AbortSignal,progress:(message:string)=>void,read?:ReadReporter){
 const bytes=new Uint8Array(await readFileBytes(file,signal,read));
 if(bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error('This DOCX is damaged or unsupported. Choose a valid .docx document.');
 progress('Validating Word document…');return run<Record<string,Uint8Array>>({action:'read',bytes},signal,progress,[bytes.buffer]);
}
export const convertWordPDF=(model:WordPDFModel,signal:AbortSignal,progress:(message:string)=>void)=>run<{blob:Blob;pages:number;warnings:string[]}>({action:'convert',model},signal,progress);

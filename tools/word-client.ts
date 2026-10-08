import type {PDFWordPage,WordDocument} from './pdf-word-layout';
export function runWord(action:'analyze',input:{pages:PDFWordPage[];warnings:string[]},signal:AbortSignal,progress:(message:string)=>void):Promise<WordDocument>;
export function runWord(action:'build',input:{document:WordDocument},signal:AbortSignal,progress:(message:string)=>void):Promise<Blob>;
export function runWord(action:string,input:object,signal:AbortSignal,progress:(message:string)=>void):Promise<WordDocument|Blob>{return new Promise((resolve,reject)=>{
 let worker:Worker;try{worker=new Worker(new URL('./docx.worker.ts',import.meta.url),{type:'module'})}catch{reject(new Error('Word processing could not start. Use a recent browser and reload.'));return}let settled=false;
 function cleanup(){worker.terminate();signal.removeEventListener('abort',cancel)}function cancel(){if(settled)return;settled=true;cleanup();reject(new DOMException('Cancelled','AbortError'))}
 if(signal.aborted){cancel();return}signal.addEventListener('abort',cancel,{once:true});
 worker.onmessage=({data})=>{if(settled)return;if(data.progress){progress(data.progress);return}settled=true;cleanup();if(data.error)reject(new Error(data.error));else resolve(data.result)};
 worker.onerror=()=>{if(settled)return;settled=true;cleanup();reject(new Error('The Word conversion worker stopped. Try fewer pages or reload in a recent browser.'))};
 try{worker.postMessage({action,...input})}catch{settled=true;cleanup();reject(new Error('Unable to prepare this document. Try a smaller PDF.'))}
})}

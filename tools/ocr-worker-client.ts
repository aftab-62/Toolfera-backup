import type {Page as OCRPage} from 'tesseract.js';
export const ocrLanguages={eng:{name:'English',path:'/_ocr/v7/lang'}} as const;
// Pinned Tesseract.js 7 worker protocol. Owning the Worker from its first moment
// allows immediate cancellation even while WASM or a language is downloading.
export function createOCRWorker(signal:AbortSignal,progress:(status:string,fraction?:number)=>void){
 const worker=new Worker('/_ocr/v7/worker.min.js');let sequence=0,stopped=false;
 const pending=new Map<string,{resolve:(data:unknown)=>void;reject:(error:Error)=>void}>();
 const stop=(error:Error=new DOMException('Cancelled','AbortError'))=>{if(stopped)return;stopped=true;worker.terminate();signal.removeEventListener('abort',abort);for(const job of pending.values())job.reject(error);pending.clear()};
 const abort=()=>stop();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)stop();
 worker.onmessage=({data})=>{if(stopped)return;if(data.status==='progress'){progress(data.data.status,data.data.progress);return}const job=pending.get(data.jobId);if(!job)return;pending.delete(data.jobId);if(data.status==='resolve')job.resolve(data.data);else job.reject(new Error(String(data.data)))};
 worker.onerror=()=>stop(new Error('OCR could not start. Reload in a recent browser and try a smaller scan.'));
 const send=(action:string,payload:object,transfer:Transferable[]=[])=>new Promise<unknown>((resolve,reject)=>{if(stopped){reject(new DOMException('Cancelled','AbortError'));return}const jobId='ocr-'+ ++sequence;pending.set(jobId,{resolve,reject});try{worker.postMessage({workerId:'utilityhub-ocr',jobId,action,payload},transfer)}catch(e){pending.delete(jobId);reject(e)}});
 return{async initialize(language:keyof typeof ocrLanguages){const origin=location.origin;await send('load',{options:{lstmOnly:true,corePath:origin+'/_ocr/v7/core',logging:false}});await send('loadLanguage',{langs:language,options:{langPath:origin+ocrLanguages[language].path,gzip:true,cacheMethod:'none',lstmOnly:true}});await send('initialize',{langs:language,oem:1,config:{}});await send('setParameters',{params:{tessedit_pageseg_mode:'3',preserve_interword_spaces:'1',user_defined_dpi:'150'}})},async recognize(bytes:Uint8Array){return await send('recognize',{image:bytes,options:{rotateAuto:true},output:{text:true,blocks:true}},[bytes.buffer as ArrayBuffer]) as OCRPage},dispose:()=>stop(new Error('OCR worker closed.'))};
}

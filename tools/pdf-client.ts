import {readFileBatch,type ReadReporter} from './file-input';
export type PDFResult={blob:Blob;pages:number;imageStats?:import('./pdf-image-optimization').ImagePDFStats[];counts?:number[];sizes?:{width:number;height:number}[]};
export async function runPDF(action:string,files:File[],options:Record<string,unknown>={},progress?:(text:string)=>void,signal?:AbortSignal,read?:ReadReporter):Promise<PDFResult>{
 progress?.('Reading files…');const inputs=await readFileBatch(files,signal,read);
 progress?.(action.startsWith('inspect')?'Validating files…':'Preparing document…');
 return new Promise((resolve,reject)=>{
  let worker:Worker;try{worker=new Worker(new URL('./pdf.worker.ts',import.meta.url),{type:'module'})}catch{reject(new Error('Unable to start PDF processing. Use a recent browser and reload this tool.'));return}let settled=false;
  const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',cancel)};
  const cancel=()=>{if(settled)return;settled=true;cleanup();reject(new DOMException('Processing cancelled.','AbortError'))};
  const fail=(message:string)=>{if(settled)return;settled=true;cleanup();reject(new Error(message))};
  if(signal?.aborted){cancel();return}signal?.addEventListener('abort',cancel,{once:true});
  worker.onmessage=({data})=>{if(settled)return;if(data.progress){progress?.(data.progress);return}settled=true;cleanup();if(data.error)reject(new Error(data.error));else resolve(data.result)};
  worker.onerror=()=>fail('Unable to start PDF processing. Try a smaller document in a recent browser.');
  worker.onmessageerror=()=>fail('Unable to read the PDF processing result. Choose the file again.');
  try{worker.postMessage({id:1,action,files:inputs,...options},inputs.map(file=>file.bytes.buffer))}catch{fail('Unable to prepare these files. Try a smaller selection.')}
 });
}

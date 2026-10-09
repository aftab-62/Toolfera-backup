import {finishAction} from './action-sequence.ts';
/** Same rolling digit columns, with a truthful phase when motion is reduced. */
export function downloadCounterOffsets(progress:number){
 const percentage=Math.min(100,Math.max(0,Math.floor(progress*100)));
 return percentage===100?[-18,-180,-540]:[0,-Math.floor(percentage/10)*18,-(percentage%10)*18];
}
export async function runDownloadSequence({href,signal,duration,doneDuration=0,beforeDone,onDone,onRequested,onProgress,activate,nextFrame}:{href:string;signal:AbortSignal;duration:number;doneDuration?:number;beforeDone?:()=>Promise<void>;onDone:()=>void;onRequested?:()=>void;onProgress?:(progress:number)=>void;activate:()=>void;nextFrame:()=>Promise<void>}){
 const start=performance.now(),url=new URL(href,location.origin);
 if(!['blob:','data:'].includes(url.protocol))throw new Error('The prepared download link is invalid. Generate the result again.');
 const response=await fetch(href,{signal}).catch(()=>{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  throw new Error('This file is no longer available. Generate the result again.');
 });
 if(!response.ok||response.headers.get('content-length')==='0')throw new Error('This file is no longer available. Generate the result again.');
 await response.body?.cancel();
 await finishAction(start,duration,signal,onProgress);
 await beforeDone?.();
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 // Finish and paint the visual sequence before browser download activation.
 const doneStart=performance.now();onDone();await nextFrame();
 await finishAction(doneStart,doneDuration,signal);
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 activate();onRequested?.();
}

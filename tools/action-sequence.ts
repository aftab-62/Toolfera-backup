export const ACTION_VISUAL_MS = 1400;
export const COMPRESS_VISUAL_MS = 1800;
// Preserve the supplied choreography on the requested 2.8-second timeline.
// The original Done label/color transition and painted activation add about
// 0.5 seconds. Keep the complete click-to-download sequence near 2.8 seconds.
export const DOWNLOAD_VISUAL_MS = 2300;
export const DOWNLOAD_DONE_MS = 300;
export const FEEDBACK_VISUAL_MS = 650;

/** Work starts immediately; only its unused visual time is awaited afterwards. */
export function finishAction(start:number,minimumMs:number,signal:AbortSignal,onProgress?:(fraction:number)=>void){
 return new Promise<void>((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort)};
  const abort=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'))};
  const tick=()=>{
   if(signal.aborted){abort();return}
   const elapsed=performance.now()-start;
   try{onProgress?.(minimumMs>0?Math.min(1,elapsed/minimumMs):1)}catch(error){cleanup();reject(error);return}
   if(elapsed>=minimumMs){cleanup();resolve();return}
   timer=setTimeout(tick,Math.min(onProgress?90:minimumMs-elapsed,minimumMs-elapsed));
  };
  if(signal.aborted){abort();return}
  signal.addEventListener('abort',abort,{once:true});tick();
 });
}

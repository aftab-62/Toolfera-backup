'use client';
import {Children,useLayoutEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import './tool-motion.css';
import {downloadCounterOffsets,runDownloadSequence} from '@/tools/download-action';
import {DOWNLOAD_VISUAL_MS,DOWNLOAD_DONE_MS} from '@/tools/action-sequence';
const shape='M4.82668561,0 L15.1733144,0 C16.0590479,0 16.8392841,0.582583769 17.0909106,1.43182334 L19.7391982,10.369794 C19.9108349,10.9490677 19.9490212,11.5596963 19.8508905,12.1558403 L19.1646343,16.3248465 C19.0055906,17.2910371 18.1703851,18 17.191192,18 L2.80880804,18 C1.82961488,18 0.994409401,17.2910371 0.835365676,16.3248465 L0.149109507,12.1558403 C0.0509788145,11.5596963 0.0891651114,10.9490677 0.260801785,10.369794 L2.90908938,1.43182334 C3.16071592,0.582583769 3.94095214,0 4.82668561,0 Z';
const digitColumns=[['',1],Array.from({length:11},(_,index)=>index%10),Array.from({length:31},(_,index)=>index%10)];
type DownloadState={href:string;phase:'idle'|'arming'|'active'|'ready'|'done'|'error';progress:number;run:number;message?:string};

export function AnimatedDownloadButton({href,download,children,className=''}:{href:string;download:string;children:ReactNode;className?:string}){
 const [state,setState]=useState<DownloadState>({href,phase:'idle',progress:0,run:0});
 const button=useRef<HTMLAnchorElement|null>(null);
 const job=useRef<AbortController|null>(null),running=useRef(false),sequence=useRef(0);
 const phase=state.href===href?state.phase:'idle',active=phase==='active'||phase==='ready'||phase==='done',busy=phase==='arming'||phase==='active'||phase==='ready',finished=phase==='ready'||phase==='done';
 const label=Children.toArray(children).filter(node=>typeof node==='string'||typeof node==='number').join('')||'Download file';
 useLayoutEffect(()=>{running.current=false;return()=>job.current?.abort()},[href]);
 async function start(){
  if(running.current)return;
  running.current=true;const controller=new AbortController();job.current=controller;
  const signal=controller.signal,run=++sequence.current;
  const nextFrame=()=>new Promise<void>((resolve,reject)=>{
   let first=0,second=0;
   const cancel=()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);signal.removeEventListener('abort',cancel);reject(new DOMException('Cancelled','AbortError'))};
   if(signal.aborted){cancel();return}
   signal.addEventListener('abort',cancel,{once:true});
   first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{signal.removeEventListener('abort',cancel);resolve()})});
  });
  const waitForAnimations=(element:Element)=>{
   const animations=element.getAnimations?.({subtree:true}).filter(animation=>animation.playState!=='finished'&&animation.effect?.getComputedTiming().iterations!==Infinity)||[];
   return new Promise<void>((resolve,reject)=>{
    const cancel=()=>{signal.removeEventListener('abort',cancel);reject(new DOMException('Cancelled','AbortError'))};
    if(signal.aborted){cancel();return}
    signal.addEventListener('abort',cancel,{once:true});
    Promise.all(animations.map(animation=>animation.finished)).then(()=>{signal.removeEventListener('abort',cancel);resolve()},error=>{signal.removeEventListener('abort',cancel);reject(error)});
   });
  };
  // The reference uses transitions: paint fresh zero-position digit columns
  // before applying .active, including every repeat download.
  setState({href,phase:'arming',progress:0,run});
  try{
   await nextFrame();setState({href,phase:'active',progress:0,run});await nextFrame();
   await runDownloadSequence({
    href,signal,duration:DOWNLOAD_VISUAL_MS,doneDuration:DOWNLOAD_DONE_MS,
    beforeDone:async()=>{
     const surface=button.current?.firstElementChild;
     if(!surface)throw new Error('Download button is no longer available. Try again.');
     // Finish the original arrow, rolling digits, 3D movement and progress
     // before showing Done, including browsers that defer painting.
     void getComputedStyle(surface).transform;await waitForAnimations(surface);
    },
    onProgress:progress=>setState(previous=>previous.href===href?{...previous,progress}:previous),
    onDone:()=>setState({href,phase:'ready',progress:1,run}),
    onRequested:()=>setState({href,phase:'done',progress:1,run}),
    nextFrame:async()=>{
     await nextFrame();
     const surface=button.current?.firstElementChild,doneLabel=button.current?.querySelector<HTMLElement>('.download-done');
     if(!surface||!doneLabel)throw new Error('Download button is no longer available. Try again.');
     // Register the restored label transition, then await the actual CSS
     // choreography. A wall-clock delay alone can finish before a mobile or
     // throttled browser paints Done.
     void getComputedStyle(doneLabel).opacity;
     await waitForAnimations(doneLabel.closest('.label')||doneLabel);
     while(Number(getComputedStyle(doneLabel).opacity)<.99)await nextFrame();
     await nextFrame();
    },
    activate:()=>{
     const anchor=document.createElement('a');anchor.href=href;anchor.download=download;anchor.hidden=true;document.body.appendChild(anchor);
     try{anchor.click()}finally{anchor.remove()}
    }
   });
  }catch(error){if(!signal.aborted)setState({href,phase:'error',progress:0,run,message:error instanceof Error?error.message:'Download could not start. Try again.'})}
  finally{if(job.current===controller)running.current=false}
 }
 const percentage=Math.min(100,Math.floor(state.progress*100)),counterOffsets=downloadCounterOffsets(state.progress);
 return <>
  <a ref={button} className={'dl-button '+(active?'active ':'')+(finished?'done ':'')+(phase==='error'?'download-error ':'')+className.split(' ').filter(name=>!['primary-button','outline-button'].includes(name)).join(' ')} style={{'--duration':DOWNLOAD_VISUAL_MS,'--download-progress':state.progress} as CSSProperties} data-download-phase={phase} data-download-progress={percentage} href={href} download={download} aria-label={label+(busy?' — preparing download':'')} aria-disabled={busy} aria-busy={busy} onClick={event=>{event.preventDefault();void start()}}>
   <div key={state.run} aria-hidden="true"><div className="icon"><div><svg className="arrow" viewBox="0 0 20 18" fill="currentColor"><polygon points="8 0 12 0 12 9 15 9 10 14 5 9 8 9"/></svg><svg className="shape" viewBox="0 0 20 18" fill="currentColor"><path d={shape}/></svg></div><span/></div>
    <div className="label"><div className={'show default '+(active||finished?'hide':'')}>{children}</div><div className={'state '+(active||finished?'show':'')}>
     <div className={'counter '+(finished?'hide':'')}>{digitColumns.map((digits,column)=><ul key={column} style={{'--counter-progress-y':counterOffsets[column]+'px'} as CSSProperties}>{digits.map((digit,index)=><li key={index}>{digit}</li>)}</ul>)}<span>%</span></div>
     <span className="download-done">Done</span>
    </div></div><div className="progress"/></div>
  </a>
  <span className="sr-only" role="status">{phase==='arming'||phase==='active'?'Preparing download. Saving starts after this short animation.':phase==='ready'?'Animation complete. Starting browser download.':phase==='done'?'Download requested. Check your browser for the saved file.':phase==='error'?state.message:''}</span>
  {phase==='error'&&<p className="error-message" role="alert">{state.message} <button type="button" className="text-link" onClick={()=>void start()}>Retry download</button></p>}
  {phase==='done'&&<button type="button" className="download-fallback text-link" onClick={()=>void start()}>Try again if your browser did not start the download</button>}
 </>;
}

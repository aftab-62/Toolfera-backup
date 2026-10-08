'use client';
import {useEffect,useRef,useState,type ButtonHTMLAttributes,type ReactNode} from 'react';
import {COMPRESS_VISUAL_MS} from '@/tools/action-sequence';
import './tool-motion.css';

export function AnimatedCompressButton({busy=false,completed=false,busyLabel='Compressing…',children,disabled,onClick,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{busy?:boolean;completed?:boolean;busyLabel?:string;children:ReactNode}){
 const [run,setRun]=useState(0),[playing,setPlaying]=useState(false);
 const guard=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const previousBusy=useRef(busy);
 useEffect(()=>{if(previousBusy.current&&!busy&&!completed){if(timer.current)clearTimeout(timer.current);guard.current=false;setPlaying(false)}previousBusy.current=busy},[busy,completed]);
 const success=completed&&!busy&&!playing,active=playing||busy;
 return <button type="button" {...props} className={'compress-button '+(active?'compress ':'')+(run&&!playing?'sequence-finished ':'')+(success?'real-success':'')} disabled={disabled||active} aria-busy={active} aria-label={active?busyLabel:typeof children==='string'?children:'Compress file'} onClick={event=>{
  if(guard.current||busy||disabled)return;
  guard.current=true;setRun(previous=>previous+1);setPlaying(true);
  if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(()=>{guard.current=false;setPlaying(false)},COMPRESS_VISUAL_MS);
  // Real compression starts in the same event, in parallel with the graphic.
  onClick?.(event);
 }}>
  {['left','middle','right'].map(position=><div key={run+'-'+position} className={'paper '+position} aria-hidden="true"/>)}
  <div key={run} className="inner"><div className="zipper" aria-hidden="true"><div className="line"/><div className="gradient"/></div><span>{active?busyLabel:children}</span><svg viewBox="0 0 20 16" aria-hidden="true"><polyline points="3 8.75 7.75 13.5 17 2.5"/></svg></div>
  <span className="sr-only">{active?busyLabel:success?'Compression complete.':''}</span>
 </button>;
}

'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ButtonHTMLAttributes,type ReactNode} from 'react';
import {Check,Copy,RotateCcw,ScanLine,Sparkles,Maximize2,FileText} from 'lucide-react';
import {ACTION_VISUAL_MS,FEEDBACK_VISUAL_MS,finishAction} from '@/tools/action-sequence';
import {AnimatedCompressButton} from './animated-compress-button';
import './tool-motion.css';

type Motion='resize'|'convert'|'merge'|'split'|'rotate'|'generate'|'analyze'|'ocr';
function infer(label:string):Motion{return /ocr/i.test(label)?'ocr':/resize|crop/i.test(label)?'resize':/merge/i.test(label)?'merge':/extract|split|delete|reorder/i.test(label)?'split':/rotate/i.test(label)?'rotate':/generate|create|password/i.test(label)?'generate':/analy/i.test(label)?'analyze':'convert'}

export function ActionButton({busy=false,busyLabel='Processing…',completed=false,children,className='primary-button',disabled,motion,onClick,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{busy?:boolean;busyLabel?:string;completed?:boolean;children:ReactNode;motion?:Motion}){
 const [pulse,setPulse]=useState(false),[run,setRun]=useState(0);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),guard=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const previousBusy=useRef(busy);
 useEffect(()=>{if(previousBusy.current&&!busy&&!completed){if(timer.current)clearTimeout(timer.current);guard.current=false;setPulse(false)}previousBusy.current=busy},[busy,completed]);
 const label=typeof children==='string'?children:'',kind=motion||infer(label),active=busy||pulse,success=completed&&!active;
 const compact=busyLabel&&busyLabel.length<=22?busyLabel:({resize:'Resizing…',convert:'Converting…',merge:'Merging…',split:'Processing…',rotate:'Rotating…',generate:'Generating…',analyze:'Analyzing…',ocr:'Recognizing…'})[kind];
 if(/compress/i.test(label))return <AnimatedCompressButton busy={busy} busyLabel="Compressing…" completed={completed} disabled={disabled} onClick={onClick} {...props}>{children}</AnimatedCompressButton>;
 return <button type="button" className={className+' action-button '+(active?'action-running ':'')+(success?'action-success':'')} disabled={disabled||active} aria-busy={active} {...props} onClick={event=>{
  if(guard.current||busy||disabled)return;
  guard.current=true;setPulse(true);setRun(previous=>previous+1);
  timer.current=setTimeout(()=>{guard.current=false;setPulse(false)},ACTION_VISUAL_MS);
  onClick?.(event);
 }}><span key={run} className={'action-motion action-'+kind} aria-hidden="true">{success?<Check/>:kind==='merge'||kind==='split'||kind==='convert'?<><span className="action-sheet"/><span className="action-sheet"/></>:kind==='resize'?<Maximize2/>:kind==='rotate'?<RotateCcw/>:kind==='generate'?<Sparkles/>:kind==='ocr'?<FileText/>:<ScanLine/>}</span><span className="action-label"><span className="action-label-size" aria-hidden="true">{children}</span><span className="action-label-size" aria-hidden="true">{compact}</span><span>{active?compact:children}</span></span></button>;
}

export function ResetButton({children='Reset',className='outline-button',onClick,disabled,...props}:ButtonHTMLAttributes<HTMLButtonElement>){
 const [pulse,setPulse]=useState(false),[run,setRun]=useState(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),guard=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 return <button type="button" className={className+' action-reset '+(pulse?'action-running':'')} disabled={disabled||pulse} {...props} onClick={event=>{
  if(guard.current||disabled)return;guard.current=true;setRun(previous=>previous+1);setPulse(true);
  if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(()=>{guard.current=false;setPulse(false)},FEEDBACK_VISUAL_MS);
  onClick?.(event);
 }}><span key={run} className="action-motion action-rotate" aria-hidden="true"><RotateCcw size={16}/></span><span className="action-label"><span className="action-label-size" aria-hidden="true">Cancel &amp; reset</span><span>{children}</span></span></button>;
}

export function CopyButton({text,children='Copy result',onStatus}:{text:string;children?:ReactNode;onStatus?:(message:string)=>void}){
 const [copiedText,setCopiedText]=useState<string|null>(null),[busy,setBusy]=useState(false),[run,setRun]=useState(0);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),job=useRef<AbortController|null>(null),guard=useRef(false);
 const copied=copiedText===text;
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset against the new result before paint, so a first tap cannot race a delayed cleanup.
 useLayoutEffect(()=>{guard.current=false;setBusy(false);return()=>{job.current?.abort();if(timer.current)clearTimeout(timer.current)}},[text]);
 return <button type="button" className={'outline-button action-copy '+(busy?'action-running ':'')+(copied&&!busy?'action-success':'')} disabled={busy} aria-busy={busy} onClick={async()=>{
  if(guard.current)return;
  guard.current=true;setBusy(true);setCopiedText(null);setRun(previous=>previous+1);
  const controller=new AbortController();job.current=controller;const start=performance.now();
  try{
   await navigator.clipboard.writeText(text);
   await finishAction(start,FEEDBACK_VISUAL_MS,controller.signal);
   if(controller.signal.aborted)return;
   setCopiedText(text);onStatus?.('Copied to clipboard.');
   if(timer.current)clearTimeout(timer.current);
   timer.current=setTimeout(()=>setCopiedText(null),2500);
  }catch{if(!controller.signal.aborted)onStatus?.('Clipboard unavailable. Select and copy the result manually.')}
  finally{if(job.current===controller&&!controller.signal.aborted){guard.current=false;setBusy(false)}}
 }}><span key={run} className="action-motion action-copy-icon" aria-hidden="true">{copied&&!busy?<Check size={16}/>:<Copy size={16}/>}</span><span className="action-label"><span className="action-label-size" aria-hidden="true">{children}</span><span className="action-label-size" aria-hidden="true">Copying…</span><span>{busy?'Copying…':copied?'Copied':children}</span></span></button>;
}

export function SuccessNote({children}:{children:ReactNode}){return <p className="success-note" role="status"><Check size={16} aria-hidden="true"/>{children}</p>}

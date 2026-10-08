'use client';
import {useEffect,useState} from 'react';
const phrases=['merge PDFs','compress PDFs','PDF to DOCX','Word to PDF','resize images','compress images','convert images','format JSON','calculate instantly'];
export function HeroPhrases(){
 const [index,setIndex]=useState(0);
 useEffect(()=>{
  // Restore v25's independent clock: focus/keyboard events must not postpone it.
  // Reduced motion slows useful text updates; it never makes them static.
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const period=()=>motion?.matches?5200:2600;
  let nextAt=Date.now()+period();
  const tick=()=>{if(!document.hidden&&Date.now()>=nextAt){nextAt=Date.now()+period();setIndex(i=>(i+1)%phrases.length)}};
  const timer=setInterval(tick,2600),resume=()=>tick();
  document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume)};
 },[]);
 return <div className="hero-verbs" aria-hidden="true"><span>Your next task</span><span className="verb-window"><b key={index} className="hero-phrase">{phrases[index]}.</b></span></div>
}

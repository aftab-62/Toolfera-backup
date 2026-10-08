'use client';
import {usePathname} from 'next/navigation';
import {Search,X} from 'lucide-react';
import {useEffect,useRef,useId,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import MobileNavigation from './mobile-navigation';
import {ToolSearch} from './search';
function Overlay({kind,onClose,children}:{kind:'menu'|'search';onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);const id=useId();
 const [closing,setClosing]=useState(false);const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current)},[]);
 function requestClose(){
  if(kind==='search'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){onClose();return}
  if(closeTimer.current)return;
  setClosing(true);closeTimer.current=setTimeout(onClose,140);
 }
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null;const dialog=ref.current;if(!dialog)return;dialog.showModal();if(kind==='search')dialog.querySelector<HTMLInputElement>('input')?.focus();return()=>{dialog.close();trigger?.focus()}},[kind]);
 return createPortal(<dialog ref={ref} id={kind==='menu'?'navigation-dialog':'search-dialog'} className={`hub-dialog ${kind==='menu'?'mobile-sheet':'search-dialog'} ${closing?'is-closing':''}`} aria-labelledby={id} onCancel={e=>{e.preventDefault();requestClose()}} onClick={e=>{if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)requestClose()}}}><div className="hub-dialog-content"><h2 id={id}>{kind==='menu'?'Explore Tool Fera':'Find a tool'}</h2><p className="hub-dialog-description">{kind==='menu'?'Browse tools by what you need to do.':'Search by tool name or the task you need to finish.'}</p><button type="button" className="hub-dialog-close" aria-label={kind==='menu'?'Close navigation menu':'Close tool search'} onClick={requestClose}><X size={20}/></button>{children}</div></dialog>,document.body);
}
export default function HeaderOverlays({search,mobile,setSearch,setMobile}:{search:boolean;mobile:boolean;setSearch:(v:boolean)=>void;setMobile:(v:boolean)=>void}){const path=usePathname()||'/';return <>{mobile&&<Overlay kind="menu" onClose={()=>setMobile(false)}><button type="button" className="mobile-search-trigger" onClick={()=>{setMobile(false);setSearch(true)}}><Search size={18}/>Find a tool</button><MobileNavigation path={path}/></Overlay>}{search&&<Overlay kind="search" onClose={()=>setSearch(false)}><ToolSearch compact animatedBorder={false} onNavigate={()=>setSearch(false)}/></Overlay>}</>}

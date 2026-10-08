'use client';
import {useState,useMemo,useRef,useEffect,useLayoutEffect} from 'react';
import {createPortal} from 'react-dom';
import {Search,X} from 'lucide-react';
import {toolUrl,toolCategories as categories} from '@/lib/tool-definitions';
import {searchTools} from '@/lib/tool-search';
import {Icon} from './icon';
import {searchPlacement} from '@/lib/search-placement';
type Placement={left:number;top:number;width:number;maxHeight:number};
export function ToolSearch({compact=false,animatedBorder=true,onNavigate}:{compact?:boolean;animatedBorder?:boolean;onNavigate?:()=>void}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(compact),[selected,setSelected]=useState(0),[placement,setPlacement]=useState<Placement|null>(null);
 const root=useRef<HTMLDivElement>(null),list=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);const id=compact?'dialog-tool-search':'hero-tool-search';
 const results=useMemo(()=>searchTools(query),[query]);
 const visible=open&&(compact||query.trim().length>0);
 useEffect(()=>{
  if(!animatedBorder||compact||!root.current?.closest('.hero-search'))return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
  const resume=()=>{
   if(document.hidden){cancelAnimationFrame(frame);frame=0;return;}
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;if(document.hidden)return;
    // CSS sets full/slower motion; resume either orbit without resetting its phase.
    for(const animation of root.current?.querySelector('.search-light')?.getAnimations?.({subtree:true})||[]){
     if((animation as CSSAnimation).animationName==='search-orbit'&&animation.playState!=='running')animation.play();
    }
   });
  };
  resume();document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);window.addEventListener('resize',resume);window.visualViewport?.addEventListener('resize',resume);motion.addEventListener('change',resume);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);window.removeEventListener('resize',resume);window.visualViewport?.removeEventListener('resize',resume);motion.removeEventListener('change',resume)};
 },[animatedBorder,compact]);
 useLayoutEffect(()=>{
  if(!visible||compact)return;let frame=0;
  const measure=()=>{const rect=root.current?.querySelector('.search-input-row')?.getBoundingClientRect();if(!rect)return;const vv=window.visualViewport;const next=searchPlacement(rect,{top:vv?.offsetTop||0,left:vv?.offsetLeft||0,height:vv?.height||window.innerHeight,width:vv?.width||window.innerWidth});setPlacement(previous=>previous&&Object.keys(next).every(key=>previous[key as keyof Placement]===next[key as keyof Placement])?previous:next)};
  const schedule=(e?:Event)=>{if(e?.target instanceof Node&&list.current?.contains(e.target))return;cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)};
  measure();const observer=new ResizeObserver(()=>schedule());if(root.current)observer.observe(root.current);
  window.addEventListener('scroll',schedule,{passive:true,capture:true});window.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  const dismiss=(e:PointerEvent)=>{const target=e.target as Node;if(!root.current?.contains(target)&&!list.current?.contains(target))setOpen(false)};document.addEventListener('pointerdown',dismiss);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);document.removeEventListener('pointerdown',dismiss)};
 },[visible,compact]);
 useEffect(()=>{if(!visible)return;const row=list.current?.querySelector<HTMLElement>('#'+id+'-result-'+selected);if(list.current&&row){const top=row.offsetTop,bottom=top+row.offsetHeight;if(top<list.current.scrollTop)list.current.scrollTop=top;else if(bottom>list.current.scrollTop+list.current.clientHeight)list.current.scrollTop=bottom-list.current.clientHeight}},[selected,visible,id,query,placement]);
 const panel=<div ref={list} className={`search-results ${compact?'':'search-popover'}`} style={compact?undefined:placement||undefined} id={id+'-results'} role="listbox" aria-label="Tool results"><div className="search-results-heading">{query?`${results.length} results`:'Frequently used tools'}</div>{results.length===0?<p className="search-empty">No matching tools. Try “PDF”, “image” or “JSON”.</p>:results.map((t,i)=><a key={t.id} href={toolUrl(t)} id={id+'-result-'+i} role="option" aria-selected={selected===i} onPointerDown={e=>{if(e.pointerType!=="mouse")e.preventDefault()}} className="search-result" onMouseEnter={()=>setSelected(i)} onClick={()=>onNavigate?.()}><span className="search-result-icon"><Icon name={t.icon}/></span><span className="search-result-title"><small>{categories.find(c=>c.slug===t.category)!.name}{!t.kind?' · In development':''}</small><strong>{t.name}</strong><span>{t.description}</span></span></a>)}</div>;
 return <div ref={root} className={`tool-search ${compact?'compact-search':''}`} onBlur={e=>{if(!compact&&!e.currentTarget.contains(e.relatedTarget)&&!list.current?.contains(e.relatedTarget as Node))setOpen(false)}}>{animatedBorder&&<div className="search-light" aria-hidden="true"/>}<div className="search-input-row"><Search size={21} aria-hidden="true"/><label className="sr-only" htmlFor={id}>Search tools</label><input ref={input} id={id} role="combobox" aria-label="Search tools" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible?id+'-results':undefined} aria-activedescendant={visible&&results[selected]?id+'-result-'+selected:undefined} autoComplete="off" autoFocus={compact} placeholder={compact?'Search by name or task':'Search tools — PDF, images, text…'} value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setSelected(0);setOpen(true)}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);else if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setSelected(i=>Math.max(0,Math.min(i+1,results.length-1)))}else if(e.key==='ArrowUp'){e.preventDefault();setSelected(i=>Math.max(0,i-1))}else if(e.key==='Enter'&&visible&&results[selected]){e.preventDefault();onNavigate?.();window.location.assign(toolUrl(results[selected]))}}}/>{query&&<button type="button" className="search-clear" aria-label="Clear search" onClick={()=>{setQuery('');setSelected(0);input.current?.focus()}}><X size={17}/></button>}</div>{visible&&(compact?panel:placement?createPortal(panel,document.body):null)}</div>
}

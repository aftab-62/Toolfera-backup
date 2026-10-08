'use client';
import { createContext,useContext,useEffect,useState,useCallback,useMemo } from 'react';
import { Star } from 'lucide-react';
import { getTool } from '@/lib/tool-definitions';
const KEY='utilityhub:saved:v1';
type Saved={favorites:string[];recent:string[]};
const initial:Saved={favorites:[],recent:[]};
export const SavedToolsContext=createContext({state:initial,loaded:false,toggle:(_id:string)=>{},visit:(_id:string)=>{},clear:()=>{}});
export function SavedToolsProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState<Saved>(initial);const [loaded,setLoaded]=useState(false);
 useEffect(()=>{const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');const clean=(a:unknown)=>Array.isArray(a)?[...new Set(a.filter((x):x is string=>typeof x==='string'&&!!getTool(x)))].slice(0,100):[];setState({favorites:clean(v.favorites),recent:clean(v.recent).slice(0,8)});}catch{setState(initial)}setLoaded(true)};read();window.addEventListener('storage',read);return()=>window.removeEventListener('storage',read)},[]);
 const update=useCallback((fn:(s:Saved)=>Saved)=>setState(s=>{const next=fn(s);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{}return next}),[]);
 const toggle=useCallback((id:string)=>update(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[id,...s.favorites].slice(0,100)})),[update]);
 const visit=useCallback((id:string)=>update(s=>({...s,recent:[id,...s.recent.filter(x=>x!==id)].slice(0,8)})),[update]);
 const clear=useCallback(()=>update(()=>initial),[update]);
 const value=useMemo(()=>({state,loaded,toggle,visit,clear}),[state,loaded,toggle,visit,clear]);
 return <SavedToolsContext.Provider value={value}>{children}</SavedToolsContext.Provider>
}
export function FavoriteButton({id,name}:{id:string;name:string}){const {state,toggle,loaded}=useContext(SavedToolsContext);const selected=state.favorites.includes(id);return <button type="button" className={`favorite-button ${selected?'selected':''}`} aria-label={`${selected?'Remove':'Add'} ${name} ${selected?'from':'to'} favorites`} aria-pressed={selected} disabled={!loaded} onClick={()=>toggle(id)}><Star size={17} fill={selected?'currentColor':'none'}/></button>}
export function RecordVisit({id}:{id:string}){const {visit,loaded}=useContext(SavedToolsContext);useEffect(()=>{if(loaded)visit(id)},[id,loaded,visit]);return null}

'use client';
import {useContext,useState} from 'react';
import {Star,Clock3} from 'lucide-react';
import {getTool,toolUrl} from '@/lib/tool-definitions';
import {Icon} from './icon';
import {SavedToolsContext,FavoriteButton} from './saved-tools-store';
export function SavedTools(){
 const {state,loaded,clear}=useContext(SavedToolsContext);const [view,setView]=useState<'recent'|'favorites'>('recent');
 if(!loaded||(!state.favorites.length&&!state.recent.length))return null;
 const current=view==='recent'&&state.recent.length?'recent':view==='favorites'&&state.favorites.length?'favorites':state.recent.length?'recent':'favorites';
 const ids=(current==='recent'?state.recent:state.favorites).slice(0,8);
 return <section className="container saved-section" aria-label="Your saved tools"><div className="saved-toolbar"><h2>Your toolkit</h2><div className="saved-switch" role="group" aria-label="Saved tool list"><button aria-pressed={current==='recent'} disabled={!state.recent.length} onClick={()=>setView('recent')}><Clock3 size={15}/>Recently used</button><button aria-pressed={current==='favorites'} disabled={!state.favorites.length} onClick={()=>setView('favorites')}><Star size={15}/>Favorites</button></div><button className="saved-clear" onClick={clear}>Clear favorites & history</button></div><div className="saved-rows">{ids.map(id=>{const t=getTool(id)!;return <article className="saved-row" key={id}><a href={toolUrl(t)}><span className="saved-icon"><Icon name={t.id}/></span><span><strong>{t.name}</strong><small>Open tool</small></span></a><FavoriteButton id={id} name={t.name}/></article>})}</div><p className="small-note">Only tool IDs are saved in this browser.</p></section>
}

'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Search,Menu} from 'lucide-react';
import {Logo} from './logo';
import HeaderOverlays from './header-overlays';
import DesktopNavigation from './desktop-navigation';
export function Header(){
 const [search,setSearch]=useState(false),[mobile,setMobile]=useState(false),[scrolled,setScrolled]=useState(false);
 const path=usePathname();
 useEffect(()=>{
  const sentinel=document.getElementById('header-sentinel');const observer=new IntersectionObserver(([entry])=>setScrolled(!entry.isIntersecting),{threshold:0});if(sentinel)observer.observe(sentinel);
  return()=>observer.disconnect();
 },[]);
 // The same navigation is present in SSR and the first client render. CSS owns
 // the breakpoint; no fallback or viewport effect can change header geometry.
 return <><a className="skip-link" href="#main">Skip to content</a><div id="header-sentinel" aria-hidden="true"/><header className={`site-header ${scrolled?'is-scrolled':''}`}><div className="header-inner"><Logo/><DesktopNavigation path={path}/><div className="header-actions"><button type="button" className="header-search" aria-label="Open tool search" aria-controls="search-dialog" aria-expanded={search} onClick={()=>setSearch(true)}><Search size={18}/><span>Find a tool</span></button><button type="button" className="mobile-menu-button" aria-label="Open navigation menu" aria-expanded={mobile} aria-controls="navigation-dialog" onClick={()=>setMobile(true)}><Menu size={22}/></button></div></div></header>{(search||mobile)&&<HeaderOverlays search={search} mobile={mobile} setSearch={setSearch} setMobile={setMobile}/>}</>
}

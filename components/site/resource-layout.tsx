import type {ReactNode} from 'react';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
import {SiteLink as Link} from './site-link';
import {Breadcrumbs} from './primitives';

export function ResourceLayout({name,path,eyebrow,title,description,children,legal=false}:{name:string;path:string;eyebrow:string;title:string;description:string;children:ReactNode;legal?:boolean}){
 return <main id="main" className={`resource-page ${legal?'resource-page-legal':''}`}><div className="container"><Breadcrumbs items={[{name:'Home',url:'/'},{name,url:path}]}/><header className="resource-hero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{legal&&<span className="resource-updated">Last updated · 4 October 2026</span>}</header>{children}</div></main>;
}
export function ResourceCTA({title='A useful tool for your next task.',description='Explore the collections, choose your tool and get back to your work.'}:{title?:string;description?:string}){
 return <aside className="resource-cta"><div><span className="eyebrow">YOUR EVERYDAY TOOLKIT</span><h2>{title}</h2><p>{description}</p></div><div className="button-row"><Link className="primary-button" href="/#hero-tool-search">Find a tool<ArrowRight size={17} aria-hidden="true"/></Link><Link className="outline-button" href="/#categories">Explore collections</Link></div></aside>;
}
export function ResourceLink({href,title,description,icon}:{href:string;title:string;description:string;icon:ReactNode}){
 return <Link className="resource-link-card" href={href}><span className="resource-icon" aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight className="resource-link-arrow" size={17} aria-hidden="true"/></Link>;
}

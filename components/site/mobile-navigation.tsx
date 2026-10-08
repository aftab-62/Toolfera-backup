'use client';
import {ChevronDown} from 'lucide-react';
import {toolCategories,availableTools,toolUrl} from '@/lib/tool-definitions';
import {SiteLink} from './site-link';
import {Icon} from './icon';
export default function MobileNavigation({path}:{path:string}){return <><nav className="mobile-nav" aria-label="Mobile navigation">{toolCategories.map(c=><details key={c.slug}><summary className={path.startsWith(`/${c.slug}/`)?'is-active':''}><Icon name={c.icon}/><span>{c.name}</span><ChevronDown size={16}/></summary><SiteLink href={`/${c.slug}/`} aria-current={path===`/${c.slug}/`?'page':undefined}>View collection</SiteLink>{availableTools(c.slug).map(t=><SiteLink href={toolUrl(t)} key={t.id} aria-current={path===toolUrl(t)?'page':undefined}>{t.name}</SiteLink>)}</details>)}</nav><div className="mobile-resources"><SiteLink href="/blog/" aria-current={path.startsWith('/blog/')?'page':undefined}>Guides</SiteLink><SiteLink href="/contact/" aria-current={path==='/contact/'?'page':undefined}>Help</SiteLink><SiteLink href="/privacy-policy/" aria-current={path==='/privacy-policy/'?'page':undefined}>Privacy</SiteLink></div></>}

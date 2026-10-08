import type {ReactNode} from 'react';
import type {Article} from '@/lib/article-types';
import {articleUrl,articleWordCount} from '@/lib/articles';
import {getGuide} from '@/lib/guides';
import {categories,getTool,toolUrl} from '@/lib/catalog';
import {site,JsonLd} from '@/lib/seo';
import {SiteLink as Link} from './site-link';
import {Breadcrumbs,ToolCard,SectionHeading} from './primitives';

// A narrow inline-link format keeps prose readable without raw HTML or a markdown runtime.
export function EditorialText({text}:{text:string}){
 const parts:ReactNode[]=[];const pattern=/\[([^\]]+)\]\((\/[^\s)]*)\)/g;let at=0;let match:RegExpExecArray|null;
 while((match=pattern.exec(text))){parts.push(text.slice(at,match.index));parts.push(<Link key={`${match.index}-${match[2]}`} href={match[2]}>{match[1]}</Link>);at=pattern.lastIndex;}
 parts.push(text.slice(at));return <>{parts}</>;
}
export function ArticlePage({article:a}:{article:Article}){
 const category=categories.find(c=>c.slug===a.category)!;
 const related=a.relatedTools.map(getTool).filter(t=>!!t?.kind);
 const linked=a.relatedArticles.map(getGuide).filter(Boolean);
 const url=new URL(articleUrl(a),site.origin).href;
 return <main id="main" className="container article-page">
  <Breadcrumbs items={[{name:'Home',url:'/'},{name:'Guides & articles',url:'/blog/'},{name:a.title,url:articleUrl(a)}]}/>
  <JsonLd data={{'@context':'https://schema.org','@type':'BlogPosting','@id':url+'#article',headline:a.title,description:a.description,url,mainEntityOfPage:{'@type':'WebPage','@id':url},datePublished:a.published,author:{'@type':'Organization','@id':site.origin+'/#organization',name:site.name,url:site.origin+'/'},publisher:{'@type':'Organization','@id':site.origin+'/#organization',name:site.name,url:site.origin+'/'},image:new URL(site.ogImage,site.origin).href,articleSection:a.topic,inLanguage:'en',isAccessibleForFree:true}}/>
  <header className="page-header article-header"><span className="eyebrow">{a.topic}</span><h1>{a.title}</h1><p>{a.intro}</p><div className="article-byline">By Tool Fera <span aria-hidden="true">·</span> <time dateTime={a.published}>8 October 2026</time> <span aria-hidden="true">·</span> {Math.max(1,Math.ceil(articleWordCount(a)/200))} min read <span>(estimate)</span></div></header>
  <div className="article-layout">
   <nav className="article-toc" aria-label="On this page"><h2>On this page</h2><ol>{a.sections.map(s=><li key={s.id}><Link href={`#${s.id}`}>{s.title}</Link></li>)}</ol><Link className="text-link" href={`/${category.slug}/`}>Explore {category.name}</Link></nav>
   <article className="article-body">
    {a.sections.map(s=><section key={s.id} id={s.id}><h2>{s.title}</h2>{s.paragraphs.map((p,i)=><p key={i}><EditorialText text={p}/></p>)}{s.list&&<ul>{s.list.map(item=><li key={item}><EditorialText text={item}/></li>)}</ul>}{s.table&&<div className="article-table-scroll" tabIndex={0} role="region" aria-label={`${s.title} comparison table`}><table><caption>{s.title}</caption><thead><tr>{s.table.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{s.table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}{s.code&&<pre tabIndex={0} aria-label="Code example"><code>{s.code}</code></pre>}</section>)}
    <p className="article-takeaway">{a.conclusion}</p>
    <footer className="article-notes"><h2>References and tool documentation</h2><ul>{a.sources.map(s=><li key={s.url}><a href={s.url}>{s.title}</a></li>)}</ul><p>Examples in this guide illustrate the stated calculations or workflow; they are not measured results for your files. Review outputs and keep important originals. <Link href="/contact/">Help & contact</Link> explains the current self-help options.</p></footer>
   </article>
  </div>
  <section className="related-section"><SectionHeading title="Put the guide to work"/><div className="tool-grid">{related.map(t=>t&&<ToolCard key={t.id} tool={t}/>)}</div></section>
  <section className="related-section"><SectionHeading title="Keep reading"/><div className="article-link-grid">{linked.map(g=>g&&<Link className="article-link" href={g.href} key={g.slug}><span className="eyebrow">{g.topic}</span><h3>{g.title}</h3><p>{g.description}</p><span className="text-link">Read guide →</span></Link>)}</div></section>
 </main>;
}

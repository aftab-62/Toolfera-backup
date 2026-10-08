import {SiteLink as Link} from './site-link';
import {ShieldCheck} from 'lucide-react';
import {type Tool,type Category,categoryTools,availableTools,categories,getTool,toolUrl} from '@/lib/catalog';
import {site,JsonLd} from '@/lib/seo';
import {Breadcrumbs,ToolCard,FAQAccordion,SectionHeading} from './primitives';
import {Icon} from './icon';
import {FavoriteButton,RecordVisit} from './saved-tools-store';
import {ToolInterface} from './tool-interface';
import {toolIntents} from '@/lib/tool-seo';
import {toolPageContent} from '@/lib/tool-page-content';
import {categoryContent} from '@/lib/category-content';
import {getGuide} from '@/lib/guides';

function GuideLinks({slugs}:{slugs:string[]}){return <ul className="guide-links">{slugs.map(getGuide).map(g=>g&&<li key={g.slug}><Link href={g.href}>{g.title}</Link><p>{g.description}</p></li>)}</ul>;}
export function CategoryLayout({category}:{category:Category}){
 const ts=categoryTools(category.slug),available=availableTools(category.slug),planned=ts.filter(t=>!t.kind),content=categoryContent[category.slug];
 return <main id="main" className="container category-content">
  <Breadcrumbs items={[{name:'Home',url:'/'},{name:category.name,url:`/${category.slug}/`}]}/>
  <header className="page-header category-page-header"><span className="page-heading-icon"><Icon name={category.icon}/></span><div><span className="eyebrow">The collection</span><h1>{category.name}</h1><p>{category.description}</p></div></header>
  {available.length>0?<><p className="category-count">{available.length} tools ready to use</p><div className="tool-grid">{available.map(t=><ToolCard tool={t} key={t.id}/>)}</div></>:<section className="collection-empty"><h2>No tools are available in this collection yet.</h2><Link className="text-link" href="/image-tools/">Browse image tools</Link></section>}
  {planned.length>0&&<details className="planned-collection"><summary>In development <span>{planned.length} tools</span></summary><ul>{planned.map(t=><li key={t.id}><Link href={toolUrl(t)}>{t.name}</Link><span>{t.description}</span></li>)}</ul></details>}
  <div className="category-guide"><section><h2>{category.guideTitle}</h2><p>{category.guide}</p></section><section><h2>Questions about {category.name.toLowerCase()}</h2><FAQAccordion items={category.faq}/></section></div>
  {content&&<><section className="category-workflows" aria-labelledby="workflow-heading"><h2 id="workflow-heading">Choose a workflow, not just a file format</h2><div>{content.workflows.map(w=><article key={w.title}><h3>{w.title}</h3><p>{w.text}</p><ul>{w.tools.map(getTool).map(t=>t?.kind&&<li key={t.id}><Link href={toolUrl(t)}>{t.name}</Link></li>)}</ul></article>)}</div></section><section className="related-section"><SectionHeading title="Helpful reading for this collection"/><GuideLinks slugs={content.guides}/></section></>}
  <section className="related-section"><SectionHeading title="Explore another collection"/><div className="related-categories">{categories.filter(c=>c.slug!==category.slug).map(c=><Link key={c.slug} href={`/${c.slug}/`}><Icon name={c.icon}/>{c.name}</Link>)}</div></section>
 </main>;
}
export function ToolLayout({tool}:{tool:Tool}){
 const c=categories.find(x=>x.slug===tool.category)!;const content=toolPageContent[tool.id];
 // Deliberate task relationships replace the unrelated category-fill fallback.
 const related=(content?.related||[]).map(getTool).filter((t):t is Tool=>!!t?.kind&&t.id!==tool.id);
 const applicationCategory=c.slug==='developer-tools'?'DeveloperApplication':c.slug==='student-tools'?'EducationalApplication':c.slug==='finance-tools'?'FinanceApplication':['pdf-tools','image-tools'].includes(c.slug)?'MultimediaApplication':'UtilitiesApplication';
 return <main id="main" className="container tool-page">
  <Breadcrumbs items={[{name:'Home',url:'/'},{name:c.name,url:`/${c.slug}/`},{name:tool.name,url:toolUrl(tool)}]}/>
  {tool.kind&&<><RecordVisit id={tool.id}/><JsonLd data={{'@context':'https://schema.org','@type':'WebApplication',name:tool.name,url:new URL(toolUrl(tool),site.origin).href,description:toolIntents[tool.id]?.description||tool.intro,applicationCategory,operatingSystem:'Any modern web browser',browserRequirements:'Requires JavaScript',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},provider:{'@type':'Organization','@id':site.origin+'/#organization',name:site.name,url:site.origin+'/'}}}/></>}
  <header className="page-header tool-page-header"><div><span className="eyebrow">{c.name}</span><h1>{tool.name}</h1><p>{tool.intro||tool.description}</p></div><FavoriteButton id={tool.id} name={tool.name}/></header>
  <div className="tool-page-layout"><div>
   {tool.kind?<section className="tool-workspace" aria-label={`${tool.name} workspace`}><div className="workspace-heading"><strong>{tool.name}</strong><span className="local-processing"><ShieldCheck size={14}/>On-device processing</span></div><ToolInterface tool={{id:tool.id,kind:tool.kind}}/></section>:<section className="tool-workspace planned-workspace"><h2>This tool is in development.</h2><p>{tool.description} The interface is not available yet.</p><Link className="primary-button" href={`/${c.slug}/`}>View {c.name}</Link></section>}
   {tool.kind&&<div className="tool-help">
    <section className="tool-explainer"><h2>How to use it</h2><ol>{tool.steps?.map((step,i)=><li key={step}><span>{String(i+1).padStart(2,'0')}</span>{step}</li>)}</ol></section>
    {content&&<section className="tool-explainer"><h2>{content.title}</h2>{content.paragraphs.map(p=><p key={p}>{p}</p>)}<p className="tool-example"><strong>Practical check: </strong>{content.example}</p></section>}
    <section className="tool-explainer"><h2>Useful details and limits</h2><p>{tool.help}</p></section>
    {tool.faq&&<section className="tool-faq"><h2>Questions about this tool</h2><FAQAccordion items={tool.faq}/></section>}
    {content?.guides.length>0&&<section className="tool-explainer"><h2>Understand the workflow</h2><GuideLinks slugs={content.guides}/></section>}
   </div>}
  </div><aside className="tool-sidebar">
   {related.length>0&&<><h2>Related tools</h2>{related.map(t=><Link key={t.id} href={toolUrl(t)}><Icon name={t.icon}/><span>{t.name}<small>{t.description}</small></span></Link>)}</>}
   <Link className="sidebar-category" href={`/${c.slug}/`}>View the {c.name.toLowerCase()} collection</Link><div className="sidebar-privacy"><ShieldCheck size={19}/><p>{tool.kind?'Your inputs stay in this page’s memory. Only tool identifiers are saved in history.':'This tool cannot accept inputs yet.'}</p></div><Link className="text-link" href="/contact/">Help & contact</Link>
  </aside></div>
  {related.length>0&&<section className="related-section"><SectionHeading title="A useful next step"/><div className="tool-grid">{related.map(t=><ToolCard key={t.id} tool={t}/>)}</div></section>}
 </main>;
}

/** Audit the built Worker with HTTP requests, not a browser or a Lighthouse simulation. */
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {tools,categories,toolUrl} from '../lib/catalog.ts';
import {toolIntents,categorySEO} from '../lib/tool-seo.ts';
import {articles} from '../lib/articles.ts';
import {guides} from '../lib/guides.ts';
import {categoryContent} from '../lib/category-content.ts';
const project=fileURLToPath(new URL('../',import.meta.url));
const origin=process.env.SITE_URL||'https://utilityhub.maftab7806.chatgpt.site';
const pages=['/',...categories.map(c=>`/${c.slug}/`),...tools.filter(t=>t.kind).map(toolUrl),'/about/','/blog/',...guides.map(g=>g.href),'/privacy-policy/','/terms-of-use/','/disclaimer/'];
const errors=[],check=(ok,msg)=>{if(!ok)errors.push(msg);};
const decode=s=>(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:x27|39);/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const tags=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','g'))].map(m=>Object.fromEntries([...m[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])])));
const text=html=>decode(html.replace(/<script\b[^>]*>.*?<\/script>/gs,'').replace(/<style\b[^>]*>.*?<\/style>/gs,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).trim();
const runtime=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/seo-audit','--ip','127.0.0.1','--port','8787','--inspector-port','0'],{cwd:project,stdio:['ignore','pipe','pipe']});
let logs='';runtime.stdout.on('data',d=>logs=(logs+d).slice(-40000));runtime.stderr.on('data',d=>logs=(logs+d).slice(-40000));
const read=async path=>{const r=await fetch('http://127.0.0.1:8787'+path,{signal:AbortSignal.timeout(20000)});return{path,status:r.status,html:await r.text(),headers:Object.fromEntries(r.headers)};};
const typeCounts={},results=[],allLinks=new Set(),images=new Set();let sm,robots,missing=[];
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clearInterval(poll);reject(Error('Worker start timeout: '+logs));},30000);const poll=setInterval(()=>{if(logs.includes('Ready on')){clearInterval(poll);clearTimeout(timer);resolve();}},100);runtime.once('exit',c=>{clearInterval(poll);clearTimeout(timer);reject(Error('Worker exited '+c+': '+logs));});});
 for(const path of pages){
  const r=await read(path),html=r.html,visible=html.replace(/<script\b[^>]*>.*?<\/script>/gs,'');
  const metas=tags(html,'meta'),meta=key=>metas.find(m=>(m.name||m.property)===key)?.content;
  const canonical=tags(html,'link').find(l=>l.rel==='canonical')?.href,title=decode(html.match(/<title>(.*?)<\/title>/s)?.[1]);
  const headings=[...visible.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].map(m=>text(m[1]));
  const noindex=meta('robots')?.includes('noindex')||false;
  check(r.status===200,`${path}: status ${r.status}`);check(headings.length===1,`${path}: ${headings.length} H1s`);check(canonical===origin+path,`${path}: canonical ${canonical}`);check(!noindex,`${path}: accidental noindex`);check(/<html\b[^>]*lang="en"/.test(html),`${path}: language`);
  for(const key of ['description','og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image'])check(!!meta(key),`${path}: missing ${key}`);
  check(meta('og:url')===canonical,`${path}: OG URL conflict`);
  const schemas=[];
  for(const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)){try{const j=JSON.parse(m[1]);check(j['@context']==='https://schema.org',`${path}: schema context`);schemas.push(...(j['@graph']||[j]));}catch{check(false,`${path}: invalid JSON-LD`);}}
  for(const s of schemas){const type=s['@type'];typeCounts[type]=(typeCounts[type]||0)+1;check(!s.aggregateRating&&!s.review,`${path}: unexpected review/rating`);if(type==='BreadcrumbList'){s.itemListElement.forEach((v,i)=>{check(v.position===i+1&&v.name&&v.item.startsWith(origin+'/'),`${path}: breadcrumb ${i}`);});check(s.itemListElement.at(-1)?.item===canonical,`${path}: breadcrumb canonical`);}if(type==='FAQPage')check(false,`${path}: unexpected FAQ schema`);}
  const tool=tools.find(t=>toolUrl(t)===path),article=articles.find(a=>`/blog/${a.slug}/`===path);
  if(tool){const app=schemas.find(s=>s['@type']==='WebApplication');check(app?.url===canonical&&app?.name===tool.name&&app?.isAccessibleForFree&&Number(app?.offers?.price)===0,`${path}: app schema`);check(headings[0]===tool.name,`${path}: tool H1`);check(text(visible).includes('How to use it')&&text(visible).includes('Useful details and limits'),`${path}: tool support content`);}
  if(article||path==='/blog/browser-tools-and-privacy/'){const s=schemas.find(s=>s['@type']==='BlogPosting');check(s?.url===canonical&&s.headline===headings[0]&&s.author?.['@type']==='Organization'&&s.datePublished,`${path}: article schema`);check(meta('og:type')==='article',`${path}: article OG type`);if(article){check(text(visible).includes(article.intro),`${path}: visible article intro`);check(s.datePublished===article.published,`${path}: article date`);}}
  const links=tags(visible,'a').map(a=>a.href).filter(Boolean),internal=[];
  for(const href of links){try{const u=new URL(href,origin+path);if(u.origin===origin){const target=u.pathname;allLinks.add(target);internal.push(target);if(u.hash&&target===path)check([...visible.matchAll(/\bid="([^"]+)"/g)].some(m=>m[1]===u.hash.slice(1)),`${path}: missing anchor ${u.hash}`);check(target==='/'||target.endsWith('/')||/\.[a-z]+$/i.test(target),`${path}: unclean internal URL ${href}`);}}catch{check(false,`${path}: invalid link ${href}`);}}
  for(const img of tags(visible,'img')){check(img.alt!==undefined,`${path}: image lacks alt`);if(img.src?.startsWith('/'))images.add(img.src);}
  const main=visible.match(/<main\b[^>]*>(.*?)<\/main>/s)?.[1]||visible;
  results.push({path,type:tool?'tool':article||path.includes('/blog/')&&path!='/blog/'?'article':categories.some(c=>'/'+c.slug+'/'===path)?'category':path==='/'?'homepage':path==='/blog/'?'article index':'information',status:r.status,title,description:meta('description'),h1:headings[0],canonical,indexable:!noindex,schema:schemas.map(s=>s['@type']),mainWords:text(main).split(/\s+/).length,linksOut:[...new Set(internal)],primary:tool?toolIntents[tool.id].primary:article?article.primary:categoryContent[path.split('/')[1]]?.primary||null});
 }
 for(const field of ['title','description','canonical']){const seen=new Map();for(const r of results){check(!!r[field],`${r.path}: empty ${field}`);check(!seen.has(r[field]),`${r.path}: duplicate ${field} with ${seen.get(r[field])}`);seen.set(r[field],r.path);}}
 const inbound=new Map(pages.map(p=>[p,new Set()]));
 for(const r of results)for(const target of r.linksOut)if(target!==r.path)inbound.get(target)?.add(r.path);
 for(const r of results){r.linksIn=[...(inbound.get(r.path)||[])];check(r.linksIn.length>0,`${r.path}: orphan`);}
 for(const path of allLinks)if(!pages.includes(path)&&path!='/contact/'){const r=await read(path);check(r.status===200,`internal destination ${path}: ${r.status}`);}
 const contact=await read('/contact/');check(contact.status===200&&tags(contact.html,'meta').some(m=>m.name==='robots'&&m.content.includes('noindex')),'contact self-help intentionally noindex');
 sm=await read('/sitemap.xml');check(sm.status===200,'sitemap status');const sitemapUrls=[...sm.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));check(new Set(sitemapUrls).size===sitemapUrls.length,'sitemap duplicates');check(sitemapUrls.length===pages.length,'sitemap count');for(const path of pages)check(sitemapUrls.includes(origin+path),'sitemap missing '+path);check(!/<lastmod>/.test(sm.html),'unverified last-modified dates');
 robots=await read('/robots.txt');check(robots.status===200&&robots.html.includes('Sitemap: '+origin+'/sitemap.xml')&&robots.html.includes('Allow: /')&&robots.html.includes('Disallow: /api/'),'robots rules');
 for(const path of ['/does-not-exist/','/pdf-tools/not-a-tool/','/blog/not-a-guide/']){const r=await read(path);check(r.status===404,'404 status '+path);check(tags(r.html,'meta').some(m=>m.name==='robots'&&m.content?.includes('noindex')),'404 noindex '+path);check(!tags(r.html,'link').some(l=>l.rel==='canonical'),'404 canonical conflict '+path);missing.push({path,status:r.status});}
 const query=await read('/pdf-tools/pdf-compressor/?source=seo-check');check(tags(query.html,'link').find(l=>l.rel==='canonical')?.href===origin+'/pdf-tools/pdf-compressor/','query canonical');
 const slashResponse=await fetch('http://127.0.0.1:8787/pdf-tools/pdf-compressor',{redirect:'manual',signal:AbortSignal.timeout(20000)});const slash={status:slashResponse.status,location:slashResponse.headers.get('location')};if(slash.status===200){check(tags(await slashResponse.text(),'link').find(l=>l.rel==='canonical')?.href===origin+'/pdf-tools/pdf-compressor/','slashless canonical');}else check([301,302,307,308].includes(slash.status)&&slash.location?.endsWith('/pdf-tools/pdf-compressor/'),'slash redirect');
 for(const asset of new Set([...images,'/favicon.svg','/brand/toolfera-social.png']))check((await read(asset)).status===200,'SEO image asset '+asset);
 check(!/(?:TypeError|ReferenceError|Unhandled|ERROR\s+\])/i.test(logs),'application runtime error in Worker log');
 await mkdir(project+'docs/seo',{recursive:true});
 const report={date:'2026-10-08',scope:'Built Worker HTTP/SSR audit; not browser rendering or field measurement',passed:errors.length===0,errors,workingTools:tools.filter(t=>t.kind).length,categories:categories.length,newArticles:articles.length,totalArticles:guides.length,indexablePages:pages.length,namedPagesIncludingContact:pages.length+1,sitemapUrls:sitemapUrls.length,internalDestinations:allLinks.size,orphanPages:results.filter(r=>!r.linksIn.length).map(r=>r.path),schemaTypes:typeCounts,contact:{status:contact.status,indexable:false},notFound:missing,trailingSlash:slash,imagesChecked:images.size+2,pages:results};
 await writeFile(project+'docs/seo/final-audit.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,pages:undefined},null,2));
 if(errors.length)process.exitCode=1;
}finally{runtime.kill('SIGTERM');}

import type { Metadata } from 'next';
import type {Article} from './article-types';
// One build/runtime setting changes all canonicals, sitemap and schema together.
const canonicalOrigin=new URL(process.env.SITE_URL||'https://utilityhub.maftab7806.chatgpt.site').origin;
export const site={name:'Tool Fera',origin:canonicalOrigin,description:'Free browser-based PDF, image, student, calculator, text, developer and generator tools. Process your inputs on your device without an account.',ogImage:'/brand/toolfera-social.png'};
export function seo(title:string,description:string,path:string,noindex=false):Metadata{
 const full=title.includes('Tool Fera')?title:`${title} | Tool Fera`;const url=new URL(path,site.origin).href;
 return {title:{absolute:full},description,alternates:{canonical:url},robots:{index:!noindex,follow:true},openGraph:{type:'website',siteName:site.name,title:full,description,url,locale:'en_US',...(site.ogImage?{images:[{url:new URL(site.ogImage,site.origin).href,width:1200,height:630,alt:'Tool Fera — Less friction. More finished.'}]}:{})},twitter:{card:site.ogImage?'summary_large_image':'summary',title:full,description,...(site.ogImage?{images:[new URL(site.ogImage,site.origin).href]}:{})}};
}
export function JsonLd({data}:{data:unknown}){return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>}
export function BreadcrumbSchema({items}:{items:{name:string;url:string}[]}){return <JsonLd data={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.name,item:new URL(x.url,site.origin).href}))}}/>}

export function articleSeo(a:Pick<Article,'seoTitle'|'description'|'slug'|'published'|'topic'>):Metadata{const base=seo(a.seoTitle,a.description,`/blog/${a.slug}/`);return {...base,openGraph:{...base.openGraph,type:'article',publishedTime:a.published,section:a.topic}};}

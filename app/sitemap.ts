import type {MetadataRoute} from 'next';
import {categories,categoryTools,tools,toolUrl} from '@/lib/catalog';
import {site} from '@/lib/seo';
import {guides} from '@/lib/guides';
export default function sitemap():MetadataRoute.Sitemap{return ['/',...categories.filter(c=>categoryTools(c.slug).some(t=>t.kind)).map(c=>`/${c.slug}/`),...tools.filter(t=>t.kind).map(toolUrl),'/about/','/blog/',...guides.map(g=>g.href),'/privacy-policy/','/terms-of-use/','/disclaimer/'].map(path=>({url:new URL(path,site.origin).href}))}

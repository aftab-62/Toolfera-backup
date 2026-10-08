import {notFound} from 'next/navigation';
import {tools} from '@/lib/catalog';
import {seo} from '@/lib/seo';
import {toolIntents} from '@/lib/tool-seo';
import {ToolLayout} from '@/components/site/page-layouts';
type Props={params:Promise<{category:string;tool:string}>};
export function generateStaticParams(){return tools.map(t=>({category:t.category,tool:t.slug}))}
export async function generateMetadata({params}:Props){const p=await params;const t=tools.find(x=>x.category===p.category&&x.slug===p.tool);if(!t)return seo('Page not found','This tool could not be found.','/',true);return seo(toolIntents[t.id]?.title||`${t.name}${t.kind?' — Free Online Tool':' — Coming Soon'}`,toolIntents[t.id]?.description||t.intro||`${t.description} Explore the upcoming ${t.name} and discover available alternatives on Tool Fera.`,`/${t.category}/${t.slug}/`,!t.kind)}
export default async function Page({params}:Props){const p=await params;const t=tools.find(x=>x.category===p.category&&x.slug===p.tool);if(!t)notFound();return <ToolLayout tool={t}/>}

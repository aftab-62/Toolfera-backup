import {notFound} from 'next/navigation';
import {categories,categoryTools} from '@/lib/catalog';
import {seo} from '@/lib/seo';
import {categorySEO} from '@/lib/tool-seo';
import {CategoryLayout} from '@/components/site/page-layouts';
import {InformationPage,information} from '@/components/site/information-page';
type Props={params:Promise<{category:string}>};
export function generateStaticParams(){return [...categories.map(c=>({category:c.slug})),...Object.keys(information).map(category=>({category}))]}
export async function generateMetadata({params}:Props){const{category}=await params;const c=categories.find(x=>x.slug===category);if(c)return seo(categorySEO[c.slug]?.title||`${c.name} — Free Online Utilities`,categorySEO[c.slug]?.description||c.description,`/${c.slug}/`,!categoryTools(c.slug).some(t=>t.kind));const p=information[category];if(p)return seo(p.title,p.description,`/${category}/`,category==='contact');return seo('Page not found','This page could not be found.','/',true)}
export default async function Page({params}:Props){const{category}=await params;const c=categories.find(x=>x.slug===category);if(c)return <CategoryLayout category={c}/>;if(information[category])return <InformationPage slug={category}/>;notFound()}

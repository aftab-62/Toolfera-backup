import {notFound} from 'next/navigation';
import {articles,getArticle} from '@/lib/articles';
import {articleSeo} from '@/lib/seo';
import {ArticlePage} from '@/components/site/article-page';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return articles.map(a=>({slug:a.slug}));}
export async function generateMetadata({params}:Props){const{slug}=await params;const a=getArticle(slug);if(!a)notFound();return articleSeo(a);}
export default async function Page({params}:Props){const{slug}=await params;const a=getArticle(slug);if(!a)notFound();return <ArticlePage article={a}/>;}

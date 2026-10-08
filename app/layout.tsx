import type {Metadata} from 'next';
import './globals.css';
import {Header} from '@/components/site/header';
import {Footer} from '@/components/site/footer';
import {SavedToolsProvider} from '@/components/site/saved-tools-store';
import {RoutePrefetch} from '@/components/site/route-prefetch';
import {site} from '@/lib/seo';
export const metadata:Metadata={metadataBase:new URL(site.origin),title:{default:'Tool Fera — Free Everyday Tools',template:'%s | Tool Fera'},description:site.description,icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><SavedToolsProvider><Header/>{children}<Footer/><RoutePrefetch/></SavedToolsProvider></body></html>}

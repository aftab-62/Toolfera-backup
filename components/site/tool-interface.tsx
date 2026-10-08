'use client';
import {lazy,Suspense,useLayoutEffect,useState,type ReactNode} from 'react';
import type {Tool} from '@/lib/catalog';
const PDFTool=lazy(()=>import('./pdf-tool'));
const PDFRasterTool=lazy(()=>import('./pdf-raster-tool'));
const PDFCompressorTool=lazy(()=>import('./pdf-compressor-tool'));
const ImagesToPDF=lazy(()=>import('./images-to-pdf'));
const WordPDFTool=lazy(()=>import('./word-pdf-tool'));
const PDFWordTool=lazy(()=>import('./pdf-word-tool'));
const MathTools=lazy(()=>import('./math-tools'));
const TextTools=lazy(()=>import('./text-tools'));
const PDFOCRTool=lazy(()=>import('./pdf-ocr-tool'));
const ImageOCRTool=lazy(()=>import('./image-ocr-tool'));
const DeveloperExtraTools=lazy(()=>import('./developer-extra-tools'));
const ImageTool=lazy(()=>import('./image-tool'));
const TransformTool=lazy(()=>import('./transform-tool'));
const QRTool=lazy(()=>import('./qr-tool'));
const AdditionalCalculators=lazy(()=>import('./additional-calculators'));
const TextCleanupTool=lazy(()=>import('./text-cleanup-tool'));
const RandomNumberTool=lazy(()=>import('./random-number-tool'));
const InvoiceTool=lazy(()=>import('./invoice-tool'));
const EverydayCalculators=lazy(()=>import('./everyday-calculators'));
function ReadyControls({children}:{children:ReactNode}){
 const [interactive,setInteractive]=useState(false);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Enable the existing SSR controls only after their event handlers commit, before paint.
 useLayoutEffect(()=>setInteractive(true),[]);
 // Preserve the server-rendered form and its dimensions, but only enable it
 // after this lazy subtree's handlers have committed. Early keystrokes cannot
 // be replaced by the client component's initial controlled values.
 return <fieldset className="tool-control-group" disabled={!interactive} aria-busy={!interactive} data-ready={interactive}><legend className="sr-only">Tool controls</legend>{children}</fieldset>;
}
export function ToolInterface({tool}:{tool:Pick<Tool,'id'|'kind'>}){
 const mode=tool.id==='pdf-splitter'?'split':tool.id==='rotate-pdf'?'rotate':tool.id==='delete-pdf-pages'?'delete':tool.id==='reorder-pdf-pages'?'reorder':'merge';
 return <div className={`tool-interface tool-interface-${tool.kind} tool-interface-${tool.id}`}><Suspense fallback={<p role="status">Preparing your tool…</p>}><ReadyControls>{tool.kind==='pdf'?<PDFTool mode={mode}/>:tool.kind==='pdf-compress'?<PDFCompressorTool/>:tool.kind==='pdf-images-out'?<PDFRasterTool/>:tool.kind==='pdf-images-in'?<ImagesToPDF/>:tool.kind==='word-pdf'?<WordPDFTool/>:tool.kind==='pdf-word'?<PDFWordTool/>:tool.kind==='pdf-ocr'?<PDFOCRTool/>:tool.kind==='image-ocr'?<ImageOCRTool/>:tool.kind==='uuid'||tool.kind==='color'?<DeveloperExtraTools kind={tool.kind}/>:tool.kind==='image'?<ImageTool initialFormat={tool.id==='jpg-to-png'?'image/png':tool.id==='png-to-jpg'?'image/jpeg':tool.id==='webp-converter'?'image/webp':undefined} mode={tool.id==='image-compressor'?'compress':tool.id==='image-resizer'?'resize':tool.id==='image-cropper'?'crop':'convert'}/>:['gpa','cgpa','percentage','fuel'].includes(tool.kind!)?<MathTools kind={tool.kind!}/>:tool.kind==='case'||tool.kind==='base64'||tool.kind==='url'?<TransformTool kind={tool.kind}/>:tool.kind==='qr'?<QRTool/>:tool.kind==='age'||tool.kind==='discount'?<EverydayCalculators kind={tool.kind}/>:['marks','attendance','merit','loan','savings','profit','salary'].includes(tool.kind!)?<AdditionalCalculators kind={tool.kind!}/>:tool.kind==='duplicates'||tool.kind==='clean'?<TextCleanupTool kind={tool.kind}/>:tool.kind==='random'?<RandomNumberTool/>:tool.kind==='invoice'?<InvoiceTool/>:<TextTools kind={tool.kind!}/>}</ReadyControls></Suspense></div>
}

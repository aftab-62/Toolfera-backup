'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {runPDF} from '@/tools/pdf-client';
import {compressPDF,compressionPresets,compressionSize,type CompressionLevel,type CompressionOutcome} from '@/tools/pdf-compression';
import {COMPRESS_VISUAL_MS} from '@/tools/action-sequence';
import {FileDropZone} from './file-dropzone';
import {useFileFeedback} from './use-file-feedback';
import {friendlyFileError,validatePDF,type ReadReporter} from '@/tools/file-input';
import {ActionButton,ResetButton,SuccessNote} from './action-button';
import {AnimatedDownloadButton} from './animated-download-button';
import {useActionSequence} from './use-action-sequence';

type Result=CompressionOutcome&{url?:string};
export default function PDFCompressorTool(){
 const sequence=useActionSequence(),intake=useFileFeedback(),controller=useRef<AbortController|null>(null),revision=useRef(0),outputURL=useRef('');
 const [file,setFile]=useState<File|null>(null),[pages,setPages]=useState(0),[level,setLevel]=useState<CompressionLevel>('recommended'),[method,setMethod]=useState<'auto'|'structure'|'image'>('auto');
 const [dpi,setDpi]=useState(144),[quality,setQuality]=useState(72),[stage,setStage]=useState<'idle'|'reading'|'compressing'>('idle'),[status,setStatus]=useState(''),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const busy=stage!=='idle';
 function clear(){if(outputURL.current)URL.revokeObjectURL(outputURL.current);outputURL.current='';setResult(null);setError('');setStatus('')}
 function reset(){intake.reset();sequence.cancel();revision.current++;controller.current?.abort();clear();intake.clear();setFile(null);setPages(0);setStage('idle');setLevel('recommended');setMethod('auto');setDpi(144);setQuality(72)}
 useEffect(()=>()=>{revision.current++;controller.current?.abort();if(outputURL.current)URL.revokeObjectURL(outputURL.current)},[]);
 async function choose(files:File[],read?:ReadReporter){
  const next=files[0];if(!next||busy)return;clear();intake.clear();setFile(null);setPages(0);const id=++revision.current;controller.current?.abort();const job=new AbortController();controller.current=job;setStage('reading');setStatus('Reading PDF…');
  try{if(next.size>20*1048576)throw new Error('Choose a PDF up to 20 MB.');await validatePDF(next);const inspected=await runPDF('inspect',[next],{},text=>{if(id===revision.current)setStatus(text)},job.signal,read);if(id!==revision.current)return;setFile(next);setPages(inspected.counts![0]);setStatus('Ready to compress.')}catch(e){if(id===revision.current&&!job.signal.aborted)intake.fail(e)}finally{if(id===revision.current)setStage('idle')}
 }
 async function process(){
  if(!file||busy)return;clear();const clock=sequence.begin(),id=++revision.current,job=new AbortController();controller.current=job;setStage('compressing');
  const report=(text:string)=>{if(id===revision.current&&!job.signal.aborted)setStatus(text)};
  try{
   const outcome=await compressPDF(file,{level,method,settings:method==='image'?{dpi,quality}:undefined},{
    optimize:()=>runPDF('compress',[file],{},report,job.signal),
    analyze:async()=>{const {canRasterPDF}=await import('@/tools/pdf-raster');return canRasterPDF(file,job.signal,report)},
    raster:async settings=>{const {rasterPDF}=await import('@/tools/pdf-raster');const rendered=await rasterPDF(file,{...settings,adaptive:true,noUpscale:true,mime:'image/jpeg',signal:job.signal,progress:report});const output=await runPDF('compress-images',rendered.files,{dimensions:rendered.dimensions,margin:0},report,job.signal);return {...output,notice:rendered.notice}}
   },job.signal,report);
   await clock.finish(COMPRESS_VISUAL_MS);if(id!==revision.current||job.signal.aborted)return;
   if(outcome.kind==='compressed'){outputURL.current=URL.createObjectURL(outcome.blob);setResult({...outcome,url:outputURL.current})}else setResult(outcome);
   setStatus('');
  }catch(e){if(id===revision.current&&!job.signal.aborted)setError(friendlyFileError(e))}finally{if(id===revision.current)setStage('idle')}
 }
 const pageProgress=/page (\d+) of (\d+)/i.exec(status),fraction=pageProgress?Number(pageProgress[1])/Number(pageProgress[2]):undefined;
 return <div className="pdf-compressor"><FileDropZone status={status} error={intake.error} resetKey={intake.resetKey} label="Choose PDF file" title={file?file.name:'Drop a PDF here'} description={file?`PDF · ${pages} pages · ${compressionSize(file.size)}`:'PDF · up to 20 MB · files stay on your device'} accept="application/pdf,.pdf" disabled={busy} busy={stage==='reading'} selected={!!file} onFiles={(files,read)=>choose(files,read)}/>
  {file&&<div className="file-selection-actions"><button className="text-link" disabled={busy} onClick={reset}><X size={13}/>Remove PDF</button><span>{pages} pages · {compressionSize(file.size)}</span></div>}
  <label className="field-label" htmlFor="compression-level">Compression level</label><select id="compression-level" className="field-input" value={level} disabled={busy} onChange={e=>{clear();intake.clear();const next=e.target.value as CompressionLevel;setLevel(next);setDpi(compressionPresets[next].dpi);setQuality(compressionPresets[next].quality)}}><option value="recommended">Recommended (default)</option><option value="strong">Strong compression</option><option value="quality">Best quality</option></select>
  <p className="small-note">{level==='strong'?'Prioritize a smaller file. Scanned pages may look softer.':level==='quality'?'Keep scanned pages sharper, with a lighter reduction in size.':'A balanced choice for everyday PDFs.'} Searchable text is kept in automatic mode.</p>
  <details className="pdf-compression-advanced"><summary>Advanced settings</summary><div><label className="field-label" htmlFor="compression-method">Processing method</label><select id="compression-method" className="field-input" value={method} disabled={busy} onChange={e=>{clear();setMethod(e.target.value as typeof method)}}><option value="auto">Automatic — protect document features</option><option value="structure">Lossless — optimize structure only</option><option value="image">Image copy — flatten all pages</option></select>
   {method==='image'&&<><p className="image-notice">Each page becomes a picture. Searchable/selectable text, links, forms and accessibility tags are removed. Use this only when that tradeoff is acceptable.</p><label className="field-label" htmlFor="compression-dpi">Scan resolution</label><select id="compression-dpi" className="field-input" disabled={busy} value={dpi} onChange={e=>{clear();setDpi(Number(e.target.value))}}><option value="96">96 DPI</option><option value="144">144 DPI</option><option value="192">192 DPI</option></select><div className="slider-field"><div className="slider-label"><label id="compression-quality">JPEG quality</label><strong>{quality}%</strong></div><Slider min={30} max={95} step={1} value={[quality]} disabled={busy} onValueChange={values=>{clear();setQuality(values[0])}} aria-labelledby="compression-quality"/></div></>}
  </div></details>
  <div className="button-row pdf-compression-actions"><ActionButton disabled={!file||busy&&stage==='reading'} busy={stage==='compressing'} busyLabel="Compressing…" completed={result?.kind==='compressed'} onClick={()=>void process()}>Compress PDF</ActionButton><ResetButton onClick={reset}>{busy?'Cancel & reset':'Reset'}</ResetButton></div>
  <div className="pdf-compression-progress" aria-live="polite"><p className="image-status" role="status">{busy?status:''}</p>{stage==='compressing'&&<progress max={1} value={fraction} aria-label="PDF compression progress" aria-valuetext={status}/>}</div>
  {error&&<p className="error-message" role="alert">{error}</p>}
  {result?.kind==='compressed'&&<><SuccessNote>PDF compressed. Your original stays unchanged.</SuccessNote><div className="result-panel pdf-compression-result"><dl><div><dt>Original</dt><dd>{compressionSize(result.originalBytes)}</dd></div><div><dt>Compressed</dt><dd>{compressionSize(result.blob.size)}</dd></div><div><dt>Saved</dt><dd>{compressionSize(result.savedBytes)} <span>({result.savedPercent.toFixed(1)}%)</span></dd></div></dl><p className="small-note">{result.pages} pages · {result.method==='image'?'Scanned pages optimized as images.':'Document structure optimized; searchable text retained.'} Review the PDF before sharing.</p><p className="small-note">{result.notice}</p><AnimatedDownloadButton href={result.url!} download="toolfera-compressed.pdf">Download PDF</AnimatedDownloadButton></div></>}
  {result?.kind==='unchanged'&&<div className="pdf-compression-notice" role="status"><strong>{result.reason==='limit'?'Your original is the best file to keep.':result.reason==='optimized'&&level==='quality'?'No smaller PDF at this quality level.':'This PDF is already well optimized.'}</strong><p>{result.reason==='limit'?'A smaller file was not found within this device’s safe page-rendering limit.':result.reason==='features'?'No meaningful reduction was found while preserving its text and document features.':level==='quality'?'The tested copies were not meaningfully smaller, so we kept your original. Try Recommended or Strong compression if a smaller scan matters more than image quality.':'The tested copies were not meaningfully smaller, so we kept your original.'}</p><span>Original: {compressionSize(result.originalBytes)} · Saved: 0 B</span></div>}
  <p className="small-note">All processing stays on your device. Automatic mode optimizes plain scans as images and protects text, forms and links. Scan rendering supports up to 40 pages; structural optimization supports up to 500. Password-protected PDFs are unsupported; digital signatures are not preserved.</p>
 </div>;
}

'use client';
import {AnimatedDownloadButton} from './animated-download-button';
import {useActionSequence} from './use-action-sequence';
import {useEffect,useRef,useState} from 'react';
import {X,FileCheck2} from 'lucide-react';
import {fileSize} from '@/tools/image-processing';
import {FileDropZone} from './file-dropzone';
import {useFileFeedback} from './use-file-feedback';
import {friendlyFileError,validatePDF,type ReadReporter} from '@/tools/file-input';
import {ActionButton,SuccessNote,ResetButton} from './action-button';
export default function PDFWordTool(){
 const sequence=useActionSequence(),intake=useFileFeedback();
 const[file,FileState]=useState<File|null>(null),[pageCount,PageCount]=useState(0),[phase,Phase]=useState<'empty'|'analyzing'|'prepared'|'building'|'ready'>('empty'),[status,Status]=useState(''),[error,Error]=useState(''),[result,Result]=useState<{url:string;name:string;bytes:number;pages:number}|null>(null);
 const job=useRef<AbortController|null>(null),revision=useRef(0),url=useRef('');const busy=phase==='analyzing'||phase==='building';
 function clearResult(){if(url.current)URL.revokeObjectURL(url.current);url.current='';Result(null)}
 function reset(){intake.reset();sequence.cancel();revision.current++;job.current?.abort();clearResult();FileState(null);PageCount(0);Phase('empty');Status('');Error('')}
 useEffect(()=>()=>{revision.current++;job.current?.abort();if(url.current)URL.revokeObjectURL(url.current)},[]);
 async function choose(files:File[],read?:ReadReporter){if(busy||!files[0])return;reset();const file=files[0],id=++revision.current;job.current=new AbortController();Phase('analyzing');Status('Reading PDF…');
  const report=(message:string)=>{if(id===revision.current)Status(message)};
  try{if(file.size>20*1048576)throw new globalThis.Error('Choose a PDF up to 20 MB.');await validatePDF(file);FileState(file);const{inspectEditablePDF}=await import('@/tools/pdf-editable-word');const info=await inspectEditablePDF(file,job.current.signal,report,read);if(id!==revision.current)return;PageCount(info.pages);Phase('prepared');Status('Ready to create editable Word text.');
  }catch(e){if(id===revision.current){intake.fail(e);FileState(null);Phase('empty');Status('')}}
 }
 async function convert(){if(!pageCount||!file||busy)return;const clock=sequence.begin(),id=++revision.current;job.current=new AbortController();clearResult();Error('');Phase('building');Status('Preparing editable conversion…');
  const report=(message:string)=>{if(id===revision.current)Status(message)};
  try{const{convertPDFToEditableWord}=await import('@/tools/pdf-editable-word');const output=await convertPDFToEditableWord(file,job.current.signal,report);await clock.finish();if(id!==revision.current)return;url.current=URL.createObjectURL(output.blob);Result({url:url.current,name:file.name.replace(/\.pdf$/i,'')+'.docx',bytes:output.blob.size,pages:output.pages});Phase('ready');Status('Ready');
  }catch(e){if(id===revision.current){Error(friendlyFileError(e));Phase('prepared');Status('')}}
 }
 const stage=phase==='ready'?3:phase==='building'?2:phase==='prepared'?1:0;
 const rendering=status.match(/^(?:Reconstructing page|Preserving graphics on page) (\d+) of (\d+)/);
 return <><FileDropZone label="Choose PDF file" title={file?file.name:'Drop a PDF here'} status={status} error={intake.error} resetKey={intake.resetKey} description={file?`PDF · ${pageCount?`${pageCount} pages · `:''}${fileSize(file.size)}`:'PDF · up to 20 MB and 40 pages · no upload'} accept="application/pdf,.pdf" disabled={busy} busy={phase==='analyzing'} selected={!!file} onFiles={(f,read)=>choose(f,read)}/>
 {file&&<div className="file-selection-actions"><button className="text-link" disabled={busy} onClick={reset}><X size={13}/>Remove / change PDF</button><span>{pageCount?`${pageCount} pages · `:''}{fileSize(file.size)}</span></div>}
 <ol className="word-flow" aria-label="Conversion steps">{['Read PDF','Check pages','Create editable Word','Download DOCX'].map((label,i)=><li key={label} className={i<=stage?'is-complete':undefined}>{i+1}. {label}</li>)}</ol>
 <p className="word-review-note"><strong>Editable Word with preserved page layout</strong><br/>Native PDF text becomes normal paragraphs in Word’s main document body, so selection and copying can continue across paragraphs and pages. Source page boundaries and intentional blank spaces are preserved. Recoverable tables stay editable; logos and complex diagrams remain localized images. No OCR. Font substitution and complex layouts can still differ from the PDF.</p>
 {!!pageCount&&<div className="word-analysis"><strong><FileCheck2 size={17} className="inline-icon"/> Ready for editable Word</strong><p>{pageCount} source pages · explicit page boundaries · real editable text</p></div>}
 <div className="button-row"><ActionButton disabled={!pageCount} motion="convert" busy={busy} busyLabel="Converting…" completed={!!result} onClick={()=>void convert()}>Convert to Word</ActionButton><ResetButton className="outline-button" onClick={reset}>{busy?'Cancel & reset':result?'Convert another PDF':'Reset'}</ResetButton></div><p className="image-status" role="status">{status}</p>{phase==='building'&&<progress max={pageCount||1} value={rendering?Math.max(0,Number(rendering[1])-1):status.startsWith('Preparing editable Word')?pageCount:undefined} aria-label="PDF page reconstruction progress"/>}{error&&<p className="error-message" role="alert">{error}</p>}{(error+intake.error).includes("scanned")&&<p><a className="text-link" href="/pdf-tools/pdf-ocr/">Use PDF OCR to extract editable text</a></p>}
 {result&&<><SuccessNote>Editable Word document created.</SuccessNote><div className="result-panel"><span className="result-label">Your Word document</span><strong className="pdf-result">{result.name}</strong><p>{result.pages} pages · .docx · {fileSize(result.bytes)}</p><div className="button-row"><AnimatedDownloadButton className="primary-button" href={result.url} download={result.name}>Download Word File</AnimatedDownloadButton></div></div></>}
 <p className="small-note">All processing stays on your device. Native text remains editable; only localized graphics render as 300 DPI images. Up to 20 MB, 40 pages and 40 MB DOCX output. Complex formatting and major edits may need manual adjustment in Word. Scanned PDFs use the separate OCR tool.</p></>;
}

'use client';
import {useEffect,useRef,useState} from 'react';
import {FileDropZone} from './file-dropzone';
import {useFileFeedback} from './use-file-feedback';
import {ActionButton,CopyButton,ResetButton,SuccessNote} from './action-button';
import {AnimatedDownloadButton} from './animated-download-button';
import {useActionSequence} from './use-action-sequence';
import {fileSize} from '@/tools/image-processing';
import {friendlyFileError,validatePDF,type ReadReporter} from '@/tools/file-input';

export default function PDFOCRTool(){
 const intake=useFileFeedback(),sequence=useActionSequence();
 const[file,setFile]=useState<File|null>(null),[pages,setPages]=useState(0),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[result,setResult]=useState<{text:string;textUrl:string;docxUrl:string;warnings:string[]}|null>(null);
 const revision=useRef(0),job=useRef<AbortController|null>(null),urls=useRef<string[]>([]);
 const clear=()=>{urls.current.forEach(URL.revokeObjectURL);urls.current=[];setResult(null)};
 const reset=()=>{revision.current++;job.current?.abort();sequence.cancel();intake.reset();clear();setFile(null);setPages(0);setBusy(false);setStatus('');setError('')};
 useEffect(()=>()=>{revision.current++;job.current?.abort();urls.current.forEach(URL.revokeObjectURL)},[]);
 async function choose(files:File[],read?:ReadReporter){if(busy||!files[0])return;reset();const input=files[0],id=++revision.current,controller=new AbortController();job.current=controller;setBusy(true);setStatus('Reading PDF…');
  try{await validatePDF(input);const{inspectOCRPDF}=await import('@/tools/pdf-ocr');const info=await inspectOCRPDF(input,controller.signal,message=>{if(id===revision.current)setStatus(message)},read);if(id!==revision.current)return;setFile(input);setPages(info.pages);setStatus('Ready for English OCR. Recognition starts when you select Extract text.')}
  catch(e){if(id===revision.current){intake.fail(e);setStatus('')}}finally{if(id===revision.current)setBusy(false)}
 }
 async function recognize(){if(!file||busy)return;const id=++revision.current,controller=new AbortController(),clock=sequence.begin();job.current=controller;clear();setBusy(true);setError('');setStatus('Preparing PDF OCR…');
  const report=(message:string)=>{if(id===revision.current)setStatus(message)};
  try{const{ocrPDF}=await import('@/tools/pdf-ocr'),{structuredOCR}=await import('@/tools/ocr-layout');const raw=await ocrPDF(file,null,controller.signal,report);if(id!==revision.current)return;report('Reconstructing paragraphs and reading order…');const output=structuredOCR(raw.pages,raw.warnings),{runWord}=await import('@/tools/word-client');const docx=await runWord('build',{document:output.document},controller.signal,report);await clock.finish();if(id!==revision.current)return;const textUrl=URL.createObjectURL(new Blob([output.text],{type:'text/plain;charset=utf-8'})),docxUrl=URL.createObjectURL(docx);urls.current.push(textUrl,docxUrl);setResult({text:output.text,textUrl,docxUrl,warnings:output.document.warnings});setStatus('Text extracted. Review names, numbers and formatting.')}
  catch(e){if(id===revision.current){setError(friendlyFileError(e));setStatus('')}}finally{if(id===revision.current)setBusy(false)}
 }
 const name=file?.name.replace(/\.pdf$/i,'')||'recognized-document';
 return <><FileDropZone label="Choose scanned PDF" title={file?file.name:'Drop a scanned PDF here'} description={file?`${pages} pages · ${fileSize(file.size)}`:'English printed text · on-device OCR'} accept="application/pdf,.pdf" limits={()=>({maxFileBytes:(window.matchMedia('(max-width:767px)').matches?5:10)*1048576})} disabled={busy} busy={busy&&!file} selected={!!file} status={status} error={intake.error} resetKey={intake.resetKey} onFiles={(files,read)=>choose(files,read)}/><p className="word-review-note">For scanned or image-only PDFs. Each page is recognized separately, then words are grouped into editable paragraphs, readable tables and column order. For selectable PDF text, use <a className="text-link" href="/pdf-tools/pdf-to-word/">PDF to Word</a>.</p><div className="button-row"><ActionButton motion="ocr" disabled={!file} busy={busy} busyLabel="Recognizing…" completed={!!result} onClick={()=>void recognize()}>Extract text</ActionButton><ResetButton onClick={reset}>{busy?'Cancel & reset':'Reset'}</ResetButton></div><p className="image-status" role="status">{status}</p>{error&&<p className="error-message" role="alert">{error}</p>}{result&&<><SuccessNote>Editable OCR text created.</SuccessNote><div className="word-analysis"><strong>{pages} source pages recognized</strong><ul>{result.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div><label className="field-label" htmlFor="pdf-ocr-text">Recognized text</label><textarea id="pdf-ocr-text" className="tool-textarea" rows={12} readOnly value={result.text}/><div className="button-row"><CopyButton text={result.text} onStatus={setStatus}>Copy text</CopyButton><AnimatedDownloadButton href={result.textUrl} download={name+'.txt'}>Download text</AnimatedDownloadButton><AnimatedDownloadButton href={result.docxUrl} download={name+'.docx'}>Download Word File</AnimatedDownloadButton></div></>}<p className="small-note">English printed text only. Mobile: 5 pages / 5 MB. Desktop: 10 pages / 10 MB. Processing is sequential with bounded page images. The OCR engine and English language load only after Extract text. Cancel terminates recognition; files are never uploaded. Handwriting, complex forms and irregular tables need manual review.</p></>;
}

import assert from 'node:assert/strict';
import {finishAction,ACTION_VISUAL_MS,COMPRESS_VISUAL_MS,DOWNLOAD_VISUAL_MS,DOWNLOAD_DONE_MS} from '../tools/action-sequence.ts';
import {runDownloadSequence} from '../tools/download-action.ts';
import {searchTools} from '../lib/tool-search.ts';

const signal=new AbortController().signal,measurements={};
for(const [label,duration] of [['action',ACTION_VISUAL_MS],['compress',COMPRESS_VISUAL_MS]]){
 const start=performance.now(),events=[];
 const work=(async()=>{events.push({event:'work-start',time:performance.now()-start});await new Promise(resolve=>setTimeout(resolve,20));events.push({event:'work-end',time:performance.now()-start});return 'real result'})();
 const result=await work;await finishAction(start,duration,signal);events.push({event:'visible-result',time:performance.now()-start});
 assert.equal(result,'real result');assert.ok(events[0].time<50,'work begins before the animation deadline');assert.ok(events[1].time<duration,'fast work runs in parallel');assert.ok(events[2].time>=duration-1,'result waits for the sequence');measurements[label]=events;
}
const longStart=performance.now();await finishAction(longStart-3000,COMPRESS_VISUAL_MS,signal);assert.ok(performance.now()-longStart<50,'long work gets no extra animation wait');
const controller=new AbortController(),cancelled=finishAction(performance.now(),1800,controller.signal);controller.abort();await assert.rejects(cancelled,{name:'AbortError'});
globalThis.location={origin:'http://terminal.local:4173'};
const href=URL.createObjectURL(new Blob(['prepared output'],{type:'text/plain'})),events=[],progress=[],start=performance.now();
const download=runDownloadSequence({href,signal,duration:DOWNLOAD_VISUAL_MS,doneDuration:DOWNLOAD_DONE_MS,beforeDone:async()=>events.push('choreography-complete'),onProgress:value=>progress.push(value),onDone:()=>events.push('animation-complete'),nextFrame:async()=>events.push('paint'),activate:()=>events.push('native-activation'),onRequested:()=>events.push('requested')});
await new Promise(resolve=>setTimeout(resolve,100));assert.deepEqual(events,[],'no early Done or browser download');await download;
assert.deepEqual(events,['choreography-complete','animation-complete','paint','native-activation','requested']);assert.ok(performance.now()-start>=DOWNLOAD_VISUAL_MS+DOWNLOAD_DONE_MS-1,'the completed label settles before native activation');assert.ok(progress.length>10);assert.equal(progress.at(-1),1);assert.ok(progress.every((value,index)=>index===0||value>=progress[index-1]));measurements.download={elapsedMs:performance.now()-start,events,progressSamples:progress.length};
let reported=false;await assert.rejects(runDownloadSequence({href,signal,duration:0,onDone:()=>{},nextFrame:async()=>{},activate:()=>{throw new Error('activation rejected')},onRequested:()=>{reported=true}}),/activation rejected/);assert.equal(reported,false,'failed activation is never reported as requested');
const duringPaint=new AbortController();await assert.rejects(runDownloadSequence({href,signal:duringPaint.signal,duration:0,onDone:()=>{},nextFrame:async()=>duringPaint.abort(),activate:()=>assert.fail('cancelled download must not activate')}),{name:'AbortError'});
URL.revokeObjectURL(href);await assert.rejects(runDownloadSequence({href,signal,duration:0,onDone:()=>assert.fail('expired result must not show Done'),nextFrame:async()=>{},activate:()=>assert.fail('expired result must not activate')}));
await assert.rejects(runDownloadSequence({href:'https://example.com/a.pdf',signal,duration:0,onDone:()=>assert.fail('unprepared external URL'),nextFrame:async()=>{},activate:()=>assert.fail()}),/prepared download link/);
const queries={'word to pdf':'word-to-pdf','pdf to word':'pdf-to-word','image to text':'image-to-text','pdf compressor':'pdf-compressor','DOCX to PDF':'word-to-pdf','pdf to docx':'pdf-to-word','compress pdf':'pdf-compressor','compress PDFs':'pdf-compressor','image to pdf':'jpg-to-pdf','pdf to images':'pdf-to-jpg','resize images':'image-resizer','qr':'qr-code-generator','json':'json-formatter'};
for(const [query,id] of Object.entries(queries))assert.equal(searchTools(query)[0]?.id,id,query);
assert.deepEqual(searchTools('no such known tool xyzzy'),[]);
console.log(JSON.stringify({passed:true,measurements,ranking:Object.fromEntries(Object.keys(queries).map(query=>[query,searchTools(query)[0].name])),checks:['real work starts in parallel','fast and long task deadlines','cancel stops timers','download progress and paint precede native activation','no requested success on rejected activation','abort after final frame','expired Blob URL rejection','directional phrase ranking']},null,2));

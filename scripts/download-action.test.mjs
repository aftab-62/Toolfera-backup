import assert from 'node:assert/strict';
import test from 'node:test';
import {downloadCounterOffsets,runDownloadSequence} from '../tools/download-action.ts';

test('reduced-motion digit columns follow intermediate progress, not final anchors',()=>{
 const cases=[[0,['0','0','0']],[.01,['0','0','-18']],[.37,['0','-54','-126']],[.5,['0','-90','0']],[.99,['0','-162','-162']],[1,['-18','-180','-540']]];
 for(const [progress,expected] of cases)assert.deepEqual(downloadCounterOffsets(progress).map(String),expected);
 assert.deepEqual(downloadCounterOffsets(-1).map(String),['0','0','0']);
 assert.deepEqual(downloadCounterOffsets(2).map(String),['-18','-180','-540']);
});

async function withDownloadEnvironment(fetcher,run){
 const originalFetch=globalThis.fetch,originalLocation=globalThis.location;
 globalThis.fetch=fetcher;globalThis.location={origin:'https://toolfera.xyz'};
 try{return await run()}finally{globalThis.fetch=originalFetch;if(originalLocation===undefined)delete globalThis.location;else globalThis.location=originalLocation;}
}
const validHref='blob:https://toolfera.xyz/button-test';

test('download waits for progress, choreography and painted Done before activation',async()=>{
 await withDownloadEnvironment(async()=>new Response('local output'),async()=>{
  const events=[],progress=[];
  await runDownloadSequence({href:validHref,signal:new AbortController().signal,duration:220,doneDuration:15,
   onProgress:value=>{progress.push(value);events.push('progress')},
   beforeDone:async()=>{assert.equal(progress.at(-1),1);events.push('choreography')},
   onDone:()=>events.push('done'),nextFrame:async()=>events.push('paint'),
   activate:()=>events.push('download'),onRequested:()=>events.push('requested')});
  assert.ok(progress[0]<.05);assert.ok(progress.some(value=>value>.1&&value<.9));assert.equal(progress.at(-1),1);
  assert.deepEqual(events.slice(-5),['choreography','done','paint','download','requested']);
 });
});

test('unavailable output never reports Done or requests a download',async()=>{
 await withDownloadEnvironment(async()=>new Response('missing',{status:404}),async()=>{
  let done=false,download=false;
  await assert.rejects(runDownloadSequence({href:validHref,signal:new AbortController().signal,duration:220,onDone:()=>{done=true},activate:()=>{download=true},nextFrame:async()=>{}}),/no longer available/);
  assert.equal(done,false);assert.equal(download,false);
 });
});

test('cancellation stops progress without false success or activation',async()=>{
 await withDownloadEnvironment(async()=>new Response('local output'),async()=>{
  const controller=new AbortController();let done=false,download=false;const timer=setTimeout(()=>controller.abort(),25);
  try{await assert.rejects(runDownloadSequence({href:validHref,signal:controller.signal,duration:220,onDone:()=>{done=true},activate:()=>{download=true},nextFrame:async()=>{}}),error=>error.name==='AbortError')}finally{clearTimeout(timer)}
  assert.equal(done,false);assert.equal(download,false);
 });
});

test('repeat download starts a fresh progress sequence',async()=>{
 await withDownloadEnvironment(async()=>new Response('local output'),async()=>{
  const runs=[];let requests=0;
  for(let run=0;run<2;run++){
   const progress=[];await runDownloadSequence({href:validHref,signal:new AbortController().signal,duration:220,onProgress:value=>progress.push(value),onDone:()=>{},activate:()=>{requests++},nextFrame:async()=>{}});runs.push(progress);
  }
  assert.equal(requests,2);for(const progress of runs){assert.ok(progress[0]<.05);assert.ok(progress.some(value=>value>.1&&value<.9));assert.equal(progress.at(-1),1)}
 });
});

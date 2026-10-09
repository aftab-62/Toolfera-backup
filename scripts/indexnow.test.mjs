import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSubmission,submitChangedUrls} from './indexnow.mjs';

const key='8feeca25cbf24334a032d888e2c9461e';
const home='https://toolfera.xyz/';
const tool='https://toolfera.xyz/pdf-tools/pdf-compressor/';
const text=body=>new Response(body,{status:200,headers:{'Content-Type':'text/plain'}});

test('explicit canonical URLs are deduplicated into the supplied-key payload',()=>{
 assert.deepEqual(buildSubmission([home,tool,home],key),{host:'toolfera.xyz',key,keyLocation:`https://toolfera.xyz/${key}.txt`,urlList:[home,tool]});
 assert.throws(()=>buildSubmission([],key));
 assert.throws(()=>buildSubmission([home],'another-key'));
 for(const url of ['http://toolfera.xyz/','https://www.toolfera.xyz/','https://toolfera.vercel.app/','https://utilityhub.maftab7806.chatgpt.site/','https://toolfera.xyz.evil.example/','https://user@toolfera.xyz/','https://toolfera.xyz/about','https://toolfera.xyz/about/?query=1','https://toolfera.xyz/#anchor','https://toolfera.xyz/contact/','https://toolfera.xyz/api/action/'])assert.throws(()=>buildSubmission([url],key),url);
});

test('dry-run performs no network requests',async()=>{
 const result=await submitChangedUrls([home],{dryRun:true,fetchImpl:()=>{throw new Error('Unexpected network request');}});
 assert.equal(result.submitted,false);
 assert.deepEqual(result.payload.urlList,[home]);
});

test('active URLs use live key and sitemap validation before one notification',async()=>{
 const calls=[];
 const result=await submitChangedUrls([home,home],{fetchImpl:async(url,options)=>{
  calls.push({url,options});
  if(calls.length===1)return text(key);
  if(calls.length===2)return text(`<urlset><url><loc>${home}</loc></url></urlset>`);
  assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body).urlList,[home]);
  return new Response(null,{status:202});
 }});
 assert.equal(calls.length,3);assert.equal(result.accepted,true);assert.equal(result.keyValidationPending,true);assert.equal(result.indexingVerified,false);
});

test('invalid key and non-indexable URLs stop before a notification',async()=>{
 let calls=0;
 await assert.rejects(submitChangedUrls([home],{fetchImpl:async()=>{calls++;return text('wrong-key');}}));assert.equal(calls,1);
 calls=0;
 await assert.rejects(submitChangedUrls(['https://toolfera.xyz/missing/'],{fetchImpl:async()=>{calls++;return calls===1?text(key):text(`<urlset><loc>${home}</loc></urlset>`);}}));assert.equal(calls,2);
});

test('explicit deleted URLs do not require current sitemap inclusion and failures do not retry',async()=>{
 const retired='https://toolfera.xyz/blog/retired-guide/';let calls=0;
 const result=await submitChangedUrls([retired],{deleted:true,fetchImpl:async(url,options)=>{
  calls++;if(calls===1)return text(key);assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body).urlList,[retired]);return new Response('rate limited',{status:429});
 }});
 assert.equal(calls,2);assert.equal(result.accepted,false);assert.equal(result.httpStatus,429);assert.equal(result.responseBody,'rate limited');
});

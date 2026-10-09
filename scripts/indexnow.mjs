import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const host='toolfera.xyz';
const origin=`https://${host}`;
const keyFile='8feeca25cbf24334a032d888e2c9461e.txt';
const endpoint='https://api.indexnow.org/indexnow';

export function buildSubmission(urls,key){
 if(key!==keyFile.slice(0,-4))throw new Error('The public IndexNow key does not match the supplied verification filename.');
 if(!Array.isArray(urls)||urls.length===0)throw new Error('Provide explicit changed canonical URLs; no sitemap-wide submission is performed.');
 const urlList=[...new Set(urls)];
 if(urlList.length>10000)throw new Error('IndexNow accepts at most 10,000 URLs per request.');
 for(const value of urlList){
  const url=new URL(value);
  if(url.origin!==origin||url.username||url.password||url.search||url.hash||url.href!==value||!url.pathname.endsWith('/')||url.pathname==='/contact/'||url.pathname.startsWith('/api/')||url.pathname.startsWith('/_')){
   throw new Error(`Use a clean indexable canonical URL on ${origin}: ${value}`);
  }
 }
 return {host,key,keyLocation:`${origin}/${keyFile}`,urlList};
}

export async function submitChangedUrls(urls,{dryRun=false,deleted=false,fetchImpl=globalThis.fetch}={}){
 const key=await readFile(new URL(`../public/${keyFile}`,import.meta.url),'utf8');
 const payload=buildSubmission(urls,key);
 if(dryRun)return {dryRun:true,deleted,endpoint,payload,submitted:false};
 const requestOptions={redirect:'error',signal:AbortSignal.timeout(20000)};
 const verification=await fetchImpl(payload.keyLocation,requestOptions);
 if(verification.status!==200||!verification.headers.get('content-type')?.startsWith('text/plain')||await verification.text()!==key){
  throw new Error('The live production key file must return HTTP 200 and only the supplied plain-text key before notification.');
 }
 if(!deleted){
  const sitemap=await fetchImpl(`${origin}/sitemap.xml`,{redirect:'error',signal:AbortSignal.timeout(20000)});
  if(sitemap.status!==200)throw new Error('The production sitemap could not be verified; no URLs were submitted.');
  const indexable=new Set([...((await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g))].map(match=>match[1]));
  for(const url of payload.urlList)if(!indexable.has(url))throw new Error(`URL is not in the live indexable sitemap: ${url}. Use --deleted only for a genuinely removed, formerly indexable URL.`);
 }
 // One explicit notification, without retries or any page-view/build hook.
 const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(20000)});
 return {endpoint,urlList:payload.urlList,httpStatus:response.status,accepted:response.status===200||response.status===202,keyValidationPending:response.status===202,responseBody:await response.text(),indexingVerified:false};
}

async function main(){
 const args=process.argv.slice(2);
 if(args.includes('--help')){
  console.log('Usage: pnpm run indexnow [--dry-run] [--deleted] https://toolfera.xyz/changed-page/ ...');
  return;
 }
 const urls=[];let dryRun=false,deleted=false;
 for(const arg of args){
  if(arg==='--dry-run')dryRun=true;
  else if(arg==='--deleted')deleted=true;
  else if(arg==='--')continue;
  else if(arg.startsWith('--'))throw new Error(`Unknown option: ${arg}`);
  else urls.push(arg);
 }
 const result=await submitChangedUrls(urls,{dryRun,deleted});
 console.log(JSON.stringify(result,null,2));
 if(!result.dryRun&&!result.accepted)process.exitCode=1;
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 main().catch(error=>{console.error(`IndexNow: ${error.message}`);process.exitCode=1;});
}

import {spawn} from 'node:child_process';
import {mkdir,readdir,readFile,writeFile,rename,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.'),directory=resolve('.sites-runtime/qa-worker');await mkdir(directory,{recursive:true});
const requestLog=process.argv[2]?resolve(process.argv[2]):null;
const runtime=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/qa-state','--ip','127.0.0.1','--port','8787','--inspector-port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
let output='',ready=false,closing=false;const jobs=new Set();
runtime.stdout.on('data',data=>{output=(output+data).slice(-16384);if(!ready&&output.includes('Ready on')){ready=true;console.log('Production Worker ready; supervised QA relay active.')}});
runtime.stderr.on('data',data=>{output=(output+data).slice(-16384)});
runtime.on('exit',code=>{if(!closing){console.error('Production Worker exited:',code,output);process.exit(1)}});
async function respond(file){
 const base=resolve(directory,file.replace('.request.json',''));
 try{
  const request=JSON.parse(await readFile(resolve(directory,file),'utf8'));
  if(!request.url?.startsWith('/')||!['GET','HEAD'].includes(request.method))throw Error('Invalid QA request');
  const response=await fetch('http://127.0.0.1:8787'+request.url,{method:request.method,headers:request.accept?{accept:request.accept}:undefined}),body=new Uint8Array(await response.arrayBuffer());
  if(requestLog)await appendFile(requestLog,JSON.stringify({time:new Date().toISOString(),url:request.url,status:response.status,bytes:body.length})+'\n');
  await writeFile(base+'.body',body,{mode:0o600});
  await writeFile(base+'.response.tmp',JSON.stringify({status:response.status,headers:Object.fromEntries(response.headers)}),{mode:0o600});await rename(base+'.response.tmp',base+'.response.json');
 }catch(error){await writeFile(base+'.body',String(error));await writeFile(base+'.response.json',JSON.stringify({status:502,headers:{'content-type':'text/plain'}}))}
 finally{jobs.delete(file)}
}
const interval=setInterval(async()=>{if(!ready)return;for(const file of await readdir(directory))if(file.endsWith('.request.json')&&!jobs.has(file)){try{await readFile(resolve(directory,file.replace('.request.json','.response.json')))}catch{jobs.add(file);void respond(file)}}},25);
function stop(){closing=true;clearInterval(interval);runtime.kill('SIGTERM');setTimeout(()=>process.exit(0),500)}
process.on('SIGINT',stop);process.on('SIGTERM',stop);

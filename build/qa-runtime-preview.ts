import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import type {Plugin} from 'vite';

// The managed preview and test Worker have isolated network namespaces. An
// opt-in, development-only file relay allows the actual built output to be QA'd
// through the supervised preview. No QA endpoint or relay enters production.
export function qaRuntimePreview():Plugin{
 return {name:'toolfera-production-qa',apply:'serve',configureServer(server){
  const directory=join(server.config.root,'.sites-runtime','qa-worker');
  server.middlewares.use(async(request,response,next)=>{
   if(request.url?.split('?')[0]==='/__qa/responsive.html'){response.setHeader('Content-Type','text/html');response.setHeader('Cache-Control','no-store');response.end(await readFile(join(server.config.root,'build','qa-responsive.html')));return}
   if(request.url?.startsWith('/__qa/')||!request.headers.cookie?.split(';').some(cookie=>cookie.trim()==='__toolfera_qa_runtime=1')){next();return}
   if(!['GET','HEAD'].includes(request.method||'GET')){response.statusCode=405;response.end();return}
   const id=randomUUID(),base=join(directory,id);let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    await mkdir(directory,{recursive:true});
    await writeFile(base+'.request.tmp',JSON.stringify({url:request.url,method:request.method,accept:request.headers.accept}),{mode:0o600});await rename(base+'.request.tmp',base+'.request.json');
    const deadline=Date.now()+30000;
    while(Date.now()<deadline&&!response.destroyed){
     try{const metadata=JSON.parse(await readFile(base+'.response.json','utf8')),body=await readFile(base+'.body');response.statusCode=metadata.status;for(const[name,value]of Object.entries(metadata.headers))if(!['content-length','content-encoding','transfer-encoding','connection'].includes(name))response.setHeader(name,value as string);response.end(request.method==='HEAD'?undefined:body);return}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
     await new Promise<void>(resolve=>{timer=setTimeout(resolve,20)});
    }
    if(!response.destroyed){response.statusCode=503;response.end('Start the production QA Worker first.');}
   }catch{if(!response.destroyed){response.statusCode=502;response.end('Production QA relay unavailable.')}}
   finally{clearTimeout(timer);await Promise.all(['.request.tmp','.request.json','.response.json','.body'].map(suffix=>rm(base+suffix,{force:true})));}
  });
 }};
}

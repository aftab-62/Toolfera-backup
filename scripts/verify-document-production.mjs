import assert from 'node:assert/strict';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
// Same supervised file relay as the browser: execution cells have isolated
// loopback namespaces. This checks actual production Worker HTTP responses.
async function request(url){const base=resolve('.sites-runtime/qa-worker',randomUUID());await writeFile(base+'.request.json',JSON.stringify({url,method:'GET',accept:'text/html'}));try{const deadline=Date.now()+15000;while(Date.now()<deadline){try{const meta=JSON.parse(await readFile(base+'.response.json','utf8'));return{...meta,body:await readFile(base+'.body','utf8')}}catch(error){if(error.code!=='ENOENT')throw error;await new Promise(r=>setTimeout(r,25))}}throw Error('Production relay timed out')}finally{await Promise.all(['.request.json','.response.json','.body'].map(ext=>rm(base+ext,{force:true})))}}
const root=resolve(process.argv[2]||'/workspace/scratch/acfb0331f292/toolfera-document-fidelity'),routes=[];
for(const path of ['/pdf-tools/pdf-to-word/','/pdf-tools/word-to-pdf/','/pdf-tools/pdf-ocr/','/image-tools/image-to-text/','/pdf-tools/']){
 const response=await request(path),html=response.body,schemas=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])),canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
 assert.equal(response.status,200,path);assert.equal((html.match(/<h1\b/g)||[]).length,1,path);assert.ok(canonical?.endsWith(path),path);assert.ok(schemas.length,path);routes.push({path,status:response.status,h1Count:1,canonical,schemaTypes:schemas.flatMap(s=>s['@graph']||[s]).map(s=>s['@type'])});
}
const sitemap=await request('/sitemap.xml'),robots=await request('/robots.txt'),unknown=await request('/pdf-tools/not-a-real-document-tool/');assert.equal(sitemap.status,200);assert.ok(sitemap.body.includes('/pdf-tools/pdf-ocr/'));assert.equal(robots.status,200);assert.match(robots.body,/Sitemap:/);assert.equal(unknown.status,404);
const manifest=JSON.parse(await readFile('dist/client/.vite/manifest.json','utf8')),bundles=[];
function staticDependencies(key,seen=new Set()){if(seen.has(key))return seen;seen.add(key);for(const dependency of manifest[key]?.imports||[])staticDependencies(dependency,seen);return seen}
for(const key of ['components/site/pdf-word-tool.tsx','components/site/word-pdf-tool.tsx','components/site/pdf-ocr-tool.tsx','components/site/image-ocr-tool.tsx','tools/pdf-to-word.ts','tools/image-ocr.ts','tools/ocr-layout.ts'])if(manifest[key]){const file=manifest[key].file,bytes=await readFile('dist/client/'+file);bundles.push({key,file,raw:bytes.length,gzip:gzipSync(bytes).length,dynamicImports:manifest[key].dynamicImports});}
const nativeDependencies=['components/site/pdf-word-tool.tsx','components/site/word-pdf-tool.tsx','tools/pdf-to-word.ts'].map(key=>({key,staticDependencies:[...staticDependencies(key)]}));for(const record of nativeDependencies)assert.ok(record.staticDependencies.every(key=>!/ocr[-/]|image-ocr|pdf-ocr/.test(key)),'native conversion imports no OCR');
const report={passed:true,routes,sitemap:{status:sitemap.status,urls:(sitemap.body.match(/<loc>/g)||[]).length,pdfOCRPresent:true},robots:{status:robots.status,body:robots.body},unknownToolStatus:unknown.status,bundles,nativeDependencies};await writeFile(root+'/production-essential.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

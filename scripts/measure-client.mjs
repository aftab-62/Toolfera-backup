import {readFile,readdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist/client/',import.meta.url)),folder=resolve(root,'_next/static/chunks');
const files=await readdir(folder);
const entry=JSON.parse(await readFile(resolve(root,'vinext-client-entry-manifest.json'),'utf8')).appBrowserEntry;
const chunk=name=>{const f=files.find(f=>f.startsWith(name+'-')&&(name!=='saved-tools'||!f.startsWith('saved-tools-store-')));assert.ok(f,'client component chunk: '+name);return resolve(folder,f)};
async function graph(starts){const seen=new Set();async function visit(path){if(seen.has(path))return;seen.add(path);const code=await readFile(path,'utf8');for(const m of code.matchAll(/\b(?:import|export)\s*(?:[^;]*?\bfrom\s*)?["`]([^"`]+)["`]/g))if(m[1].startsWith('.'))await visit(resolve(dirname(path),m[1]))}for(const path of starts)await visit(path);const chunks=await Promise.all([...seen].map(async p=>{const b=await readFile(p);return{file:basename(p),rawBytes:b.length,gzipBytes:gzipSync(b).length}}));return{rawBytes:chunks.reduce((a,b)=>a+b.rawBytes,0),gzipBytes:chunks.reduce((a,b)=>a+b.gzipBytes,0),chunks}}
const searchCandidates=await Promise.all(files.filter(f=>f.startsWith('search-')).map(async f=>({file:f,code:await readFile(resolve(folder,f),'utf8')})));
const search=searchCandidates.find(x=>x.code.includes('search-input-row'));assert.ok(search,'hero search UI');
const initial=await graph([resolve(root,entry),resolve(folder,search.file),...['layout-segment-context','header','saved-tools-store','saved-tools','hero-phrases'].map(chunk)]);
assert.ok(!initial.chunks.some(x=>/^(image-tool|pdf-tool|pdf-raster|pdf-word-tool|pdf-to-word|pdf-editable-word|docx-package|word-pdf-tool|word-docx-parser|word-pdf-render|pdf-ocr|ocr-worker-client|image-ocr-tool|tesseract|qrcode)-/.test(x.file)),'processing engines and tool UIs stay outside homepage graph');
const result={initialStaticGraph:initial,note:'Sum of raw and separately gzip-compressed static chunks. Shared chunks are counted once. Not an observed network payload, Lighthouse or Core Web Vitals measurement.'};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

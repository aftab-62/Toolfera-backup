import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

// Targeted built-Worker checks only. No preview server or browser session.
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,Log,LogLevel}=wranglerRequire('miniflare');
const output=resolve(process.argv[2]||'document-flow-production.json');
const manifest=JSON.parse(await readFile('dist/client/.vite/manifest.json','utf8'));
const component=manifest['components/site/pdf-word-tool.tsx'];
assert.deepEqual(component.dynamicImports,['tools/pdf-editable-word.ts']);
const engineKey='tools/pdf-editable-word.ts',engine=manifest[engineKey];
assert(engine);
const closure=new Set();
function visit(key){if(closure.has(key))return;closure.add(key);for(const next of manifest[key]?.imports||[])visit(next)}
visit(engineKey);
assert([...closure].every(key=>!/(?:tesseract|ocr|word-worker-client|pdf-to-word|pdf-word-layout|docx-package)/i.test(key)));
const wordComponent=manifest['components/site/word-pdf-tool.tsx'];assert(wordComponent);
const wordAssets=Object.values(manifest).filter(entry=>/word-pdf/.test(entry.file||''));
const engineSource=await readFile('tools/pdf-editable-word.ts','utf8');
assert(/getTextContent\s*\(/.test(engineSource));
assert(!/tesseract|from ['\"][^'\"]*ocr|\brecognize\s*\(/i.test(engineSource));
const warnings=[],errors=[];
const log=new Log(LogLevel.WARN);
log.warn=(message)=>warnings.push(String(message));
log.error=(message)=>errors.push(String(message));
const serverRoot=resolve('dist/server');
const serverFiles=(await readdir(serverRoot,{recursive:true})).filter(file=>/\.(?:m?js)$/.test(file)).sort();
const modules=['index.js',...serverFiles.filter(file=>file!=='index.js')].map(file=>({type:'ESModule',path:resolve(serverRoot,file)}));
const mf=new Miniflare({
  modules,modulesRoot:serverRoot,
  compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
  assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true}},
  log,
});
const timeout=setTimeout(()=>{console.error('Targeted Worker check exceeded 45 seconds.');process.exit(1)},45000);
try{
  const response=await mf.dispatchFetch('http://toolfera.test/pdf-tools/pdf-to-word/');
  const html=await response.text();
  assert.equal(response.status,200);
  assert.match(html,/Editable Word with preserved page layout/i);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1);
  assert.match(html,/<link[^>]+rel="canonical"[^>]+pdf-tools\/pdf-to-word\//);
  const schemas=[...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const schemaText=JSON.stringify(schemas);
  assert.match(schemaText,/WebApplication|SoftwareApplication/);
  assert.match(schemaText,/BreadcrumbList/);
  assert.match(schemaText,/FAQPage/);
  const wordResponse=await mf.dispatchFetch('http://toolfera.test/pdf-tools/word-to-pdf/');const wordHTML=await wordResponse.text();assert.equal(wordResponse.status,200);assert.match(wordHTML,/No OCR is used/);assert.equal((wordHTML.match(/<h1(?:\s|>)/g)||[]).length,1);assert.match(wordHTML,/<link[^>]+rel="canonical"[^>]+pdf-tools\/word-to-pdf\//);
  const wordFiles=(await readdir('dist/client',{recursive:true})).filter(file=>/(?:^|\/)word-pdf\.worker[^/]*\.js$/.test(file));assert.equal(wordFiles.length,1);const wordSource=await readFile('dist/client/'+wordFiles[0],'utf8');assert(!/tesseract|traineddata|tesseract-core/i.test(wordSource));assert.match(wordSource,/tiny text line height/);
  for(const asset of [`/${engine.file}`,'/'+wordFiles[0],'/_pdfjs/v5.4.624/pdf.worker.min.mjs','/_word/fonts/LiberationSans-Regular.ttf']){
    const result=await mf.dispatchFetch('http://toolfera.test'+asset);
    assert.equal(result.status,200,asset);
    await result.arrayBuffer();
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  const result={passed:true,method:'Short-lived Miniflare dispatchFetch against the existing production build; no browser or preview server',routes:[{path:'/pdf-tools/pdf-to-word/',status:response.status},{path:'/pdf-tools/word-to-pdf/',status:wordResponse.status}],wordWorkerAsset:wordFiles[0],wordWorkerOCRDependency:false,status:response.status,h1Count:1,canonical:true,structuredData:['WebApplication/SoftwareApplication','BreadcrumbList','FAQPage'],pdfWordDynamicImport:component.dynamicImports[0],engineStaticDependencyClosure:[...closure],ocrDependencyPresent:false,pdfWorkerAssetStatus:200,engineAssetStatus:200,wordWorkerAssetStatus:200,fontAssetStatus:200,workerErrors:errors,warnings};
  await writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{
  await mf.dispose();
  clearTimeout(timeout);
}

import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';

// Production HTTP/asset verification only. This does not run browser JavaScript.
process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const output=resolve(process.argv[2]||'header-production.json');
const manifest=JSON.parse(await readFile('dist/client/.vite/manifest.json','utf8'));
const headerEntry=manifest['components/site/header.tsx'];assert(headerEntry);
assert(!(headerEntry.dynamicImports||[]).includes('components/site/desktop-navigation.tsx'),'No deferred desktop nav swap');
const closure=new Set();function visit(key){if(closure.has(key))return;closure.add(key);for(const child of manifest[key]?.imports||[])visit(child)}
visit('components/site/header.tsx');
const files=[...new Set([...closure].map(key=>manifest[key]?.file).filter(Boolean))],bundles=[];
for(const file of files){const buffer=await readFile('dist/client/'+file);bundles.push({file,raw:buffer.length,gzip:gzipSync(buffer).length})}
const serverRoot=resolve('dist/server');
const scripts=(await readdir(serverRoot,{recursive:true})).filter(file=>/\.(?:m?js)$/.test(file)).sort();
const errors=[],warnings=[],log=new Log(LogLevel.WARN);log.error=msg=>errors.push(String(msg));log.warn=msg=>warnings.push(String(msg));
const mf=new Miniflare({modules:['index.js',...scripts.filter(file=>file!=='index.js')].map(file=>({type:'ESModule',path:resolve(serverRoot,file)})),modulesRoot:serverRoot,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true}},log});
const timeout=setTimeout(()=>{console.error('Header production check exceeded 45 seconds');process.exit(1)},45000);
try{
 const samples=[],headers=[];
 for(const [path,agent,delayed] of [['/','desktop',false],['/','mobile',true],['/pdf-tools/pdf-compressor/','mobile',false],['/image-tools/image-resizer/','mobile',false],['/student-tools/percentage-calculator/','mobile',false],['/developer-tools/json-formatter/','desktop',false],['/about/','mobile',false]]){
  const response=await mf.dispatchFetch('http://toolfera.test'+path,{headers:{'user-agent':agent==='mobile'?'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36':'Mozilla/5.0 Chrome/130.0 Safari/537.36'}});
  assert.equal(response.status,200);
  let html='',chunks=0;const reader=response.body.getReader();
  for(;;){const {value,done}=await reader.read();if(done)break;html+=new TextDecoder().decode(value);chunks++;if(delayed)await new Promise(done=>setTimeout(done,40))}
  const header=html.match(/<header\b[^>]*class="site-header[^\"]*"[^>]*>[\s\S]*?<\/header>/)?.[0];assert(header);
  assert(!/static-navigation|header-energy|<template|<!--\$\?/.test(header));
  assert(!/header-atmosphere|header-network|<canvas/.test(header),'No decorative canvas remains mounted');
  assert.match(html,/<footer[^>]+class="site-footer"/);
  assert.match(header,/<nav[^>]+class="desktop-navigation"[^>]+aria-label="Main navigation"[^>]*><ul class="nav-list">/);
  assert.equal((header.match(/class="nav-trigger[^"]*"/g)||[]).length,7);
  if(path==='/')headers.push(header);
  const head=html.slice(0,html.indexOf('</head>'));
  const styleLinks=[...head.matchAll(/<link\b[^>]*>/g)].filter(m=>/rel="stylesheet"/.test(m[0])).map(m=>m[0]);assert(styleLinks.length,'Stylesheets are present in the initial document head');
  assert(styleLinks.every(link=>!/(?:media="print"|disabled|onload=)/.test(link)),'Header CSS must not be deferred until JS');
  const hrefs=styleLinks.map(link=>link.match(/href="([^"]+)"/)[1]);
  const cssParts=[];
  for(const href of hrefs){const asset=await mf.dispatchFetch(new URL(href,'http://toolfera.test'));assert.equal(asset.status,200);cssParts.push(await asset.text())}
  const css=cssParts.join('\n');
  assert(!/<canvas/.test(header));
  assert(!/@keyframes header-(drift|glow)/.test(css),'Old background animation must not ship');
  assert(!css.includes('.header-energy'),'Removed strip CSS must not ship');
  assert(!css.includes('.static-navigation'),'Removed fallback geometry must not ship');
  assert(!/\.header-network\{|\.header-atmosphere\{/.test(css));
  assert(css.includes('#12213c')&&css.includes('#223d70'),'Static navy/royal-blue header styles are present');
  assert.match(css,/prefers-reduced-motion/);
  samples.push({path,userAgent:agent,delayedStreamConsumption:delayed,chunkCount:chunks,status:200,headerHasAllSevenTriggers:true,blockingStylesheetCount:hrefs.length});
 }
 assert(headers.every(header=>header===headers[0]),'Production SSR header is identical across repeated desktop/mobile requests');
 for(const file of files){const response=await mf.dispatchFetch('http://toolfera.test/'+file);assert.equal(response.status,200);const js=await response.text();assert(!/header-network-debug|networkDiagnostics|header-atmosphere|createHeaderNetwork|mountHeaderNetwork/.test(js),'No removed network runtime ships in header dependencies')}
 assert.equal(errors.length,0,JSON.stringify(errors));
 const result={passed:true,method:'Short-lived production Worker emulator; seven scoped HTTP responses, asset retrieval and delayed stream consumption, not browser painting',samples,sameHomeHeaderAcrossRequests:true,noCanvasOrNetworkRuntime:true,noLazyNavigationSwap:true,initialHeadHasBlockingStylesheets:true,headerStaticFiles:bundles,headerStaticRawBytes:bundles.reduce((n,file)=>n+file.raw,0),headerStaticGzipBytes:bundles.reduce((n,file)=>n+file.gzip,0),workerErrors:errors,warnings,unverified:['visual gradients on desktop/mobile','touch/keyboard GUI behavior','physical phones','measured overflow/CLS','actual throttled browser reload','browser console/hydration']};
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:true,requests:samples.length,headerIdentical:true,blockingCSS:true,headerStaticRawBytes:result.headerStaticRawBytes,headerStaticGzipBytes:result.headerStaticGzipBytes,workerErrors:errors,warnings},null,2));
}finally{await mf.dispose();clearTimeout(timeout)}

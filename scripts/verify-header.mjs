import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire,Module} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';

// SSR + authored CSS-state checks, not a browser or a layout/animation renderer.
const require=createRequire(import.meta.url),ts=require('typescript');
const postcss=createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const {DOMParser}=require('@xmldom/xmldom');
const root=resolve('.'),output=resolve(process.argv[2]||'header-checks.json');
const cache=new Map();let pathname='/';
function load(file){
 if(file.endsWith('.css'))return {};
 if(!existsSync(file))file=['.tsx','.ts','.mjs','.js'].map(ext=>file+ext).find(existsSync);
 assert(file,'A required source module is missing');if(cache.has(file))return cache.get(file).exports;
 const module=new Module(file);cache.set(file,module);module.filename=file;module.paths=Module._nodeModulePaths(dirname(file));
 const native=module.require.bind(module);
 module.require=id=>id==='next/navigation'?{usePathname:()=>pathname}:id.startsWith('@/')?load(resolve(root,id.slice(2))):id.startsWith('.')?load(resolve(dirname(file),id)):native(id);
 module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,file);return module.exports;
}
const {Header}=load(resolve('components/site/header.tsx'));
const {MobileNavigation}=load(resolve('components/site/header-overlays.tsx'));
const {Footer}=load(resolve('components/site/footer.tsx'));
const css=postcss.parse(readFileSync('app/globals.css','utf8'));
function document(html){return new DOMParser().parseFromString(`<html data-toolfera-motion="full"><body>${html}</body></html>`,'text/xml')}
function find(doc,cls){return [...doc.getElementsByTagName('*')].find(el=>(el.getAttribute('class')||'').split(/\s+/).includes(cls))}
function simple(el,selector,pseudo,states){
 const pe=selector.match(/::(before|after)/)?.[1];if((pe||'')!==(pseudo||''))return false;selector=selector.replace(/::(?:before|after)/g,'');
 selector=selector.replace(/:not\(([^)]+)\)/g,(_,s)=>simple(el,s,'',states)?'!NO!':'');
 if(selector.includes('!NO!')||selector.includes(':has('))return false;
 for(const state of ['active','hover','focus-visible','focus-within'])if(selector.includes(':'+state)){if(!states.has(state))return false;selector=selector.replaceAll(':'+state,'')}
 if(selector.includes(':root')){if(el.tagName!=='html')return false;selector=selector.replace(':root','')}
 const siblings=el.parentNode?[...el.parentNode.childNodes].filter(n=>n.nodeType===1):[];
 for(const edge of ['first-child','last-child','first-of-type'])if(selector.includes(':'+edge)){
  const nodes=edge==='first-of-type'?siblings.filter(n=>n.tagName===el.tagName):siblings;
  if(el!==(edge==='last-child'?nodes.at(-1):nodes[0]))return false;selector=selector.replace(':'+edge,'');
 }
 if(/:[\w-]/.test(selector))return false;
 let ok=true;selector=selector.replace(/\[([^\]=]+)(?:=(["']?)([^\]"']+)\2)?\]/g,(_,name,q,value)=>{if(!el.hasAttribute(name)||value!==undefined&&el.getAttribute(name)!==value)ok=false;return ''});
 selector=selector.replace(/\.([\w-]+)/g,(_,cls)=>{if(!(el.getAttribute('class')||'').split(/\s+/).includes(cls))ok=false;return ''});
 selector=selector.replace(/#([\w-]+)/g,(_,id)=>{if(el.getAttribute('id')!==id)ok=false;return ''});
 return ok&&(!selector||selector==='*'||selector===el.tagName);
}
function matches(el,selector,pseudo='',states=new Set()){
 const parts=selector.replace(/\s*>\s*/g,' > ').trim().split(/\s+/);let index=parts.length-1,node=el;
 if(!simple(node,parts[index--],pseudo,states))return false;
 while(index>=0){
  if(parts[index]==='>'){node=node.parentNode;index--;if(!node?.tagName||!simple(node,parts[index--],'',new Set()))return false}
  else{const s=parts[index--];node=node.parentNode;while(node?.tagName&&!simple(node,s,'',new Set()))node=node.parentNode;if(!node?.tagName)return false}
 }return true;
}
function mediaMatches(condition,width,reduced){
 if(condition.includes('prefers-reduced-motion')&&condition.includes('reduce')&&!reduced)return false;
 if(condition.includes('hover:hover'))return false;
 const min=condition.match(/min-width\s*:\s*(\d+)px/),max=condition.match(/max-width\s*:\s*(\d+)px/);
 return (!min||width>=+min[1])&&(!max||width<=+max[1]);
}
function specificity(s){return (s.match(/#[\w-]+/g)||[]).length*10000+(s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g)||[]).length*100+(s.replace(/\[[^\]]+\]|[.#:][\w-]+|\([^)]*\)/g,'').match(/[a-zA-Z][\w-]*/g)||[]).length}
function styles(el,width,{pseudo='',states=[],reduced=false}={}){
 const resolved={};let order=0;
 css.walkRules(rule=>{
  let parent=rule.parent;while(parent?.type!=='root'){if(parent.type==='atrule'&&parent.name==='keyframes')return;if(parent.type==='atrule'&&parent.name==='media'&&!mediaMatches(parent.params,width,reduced))return;parent=parent.parent}
  for(const selector of rule.selectors){if(!matches(el,selector,pseudo,new Set(states)))continue;
   const weight=specificity(selector);
   rule.walkDecls(decl=>{const put=(prop,value)=>{const rank=[decl.important?1:0,weight,order++],previous=resolved[prop];if(!previous||rank[0]>previous.rank[0]||rank[0]===previous.rank[0]&&(rank[1]>previous.rank[1]||rank[1]===previous.rank[1]&&rank[2]>=previous.rank[2]))resolved[prop]={value,rank}};
    put(decl.prop,decl.value);
    if(decl.prop==='margin'){const v=decl.value.split(/\s+/);for(const [i,side] of ['top','right','bottom','left'].entries())put('margin-'+side,v[i]||v[i%2]||v[0])}
   });
  }
 });return Object.fromEntries(Object.entries(resolved).map(([key,data])=>[key,data.value]));
}
const headerSource=readFileSync('components/site/header.tsx','utf8');
assert(!/\blazy\b|Suspense|matchMedia|static-navigation/.test(headerSource),'No async or breakpoint replacement is permitted in the header');
const renders=[];
for(const route of ['/','/pdf-tools/pdf-compressor/','/contact/']){
 pathname=route;const html=renderToStaticMarkup(createElement(Header));
 for(let i=0;i<4;i++)assert.equal(renderToStaticMarkup(createElement(Header)),html,'Repeated SSR has the same header tree');
 const doc=document(html),nav=find(doc,'desktop-navigation');assert(nav);
 assert.equal(nav.getElementsByTagName('button').length,7);assert.equal(nav.getElementsByTagName('a').length,0);
 assert.equal(find(doc,'header-energy'),undefined);assert.equal(find(doc,'header-atmosphere'),undefined);
 assert.equal(doc.getElementsByTagName('canvas').length,0);
 if(route.includes('pdf-tools'))assert(nav.getElementsByTagName('button')[0].getAttribute('class').includes('active'));
 renders.push({route,repeatedSSR:5,desktopTriggers:7});
}
pathname='/pdf-tools/pdf-compressor/';
const headerDoc=document(renderToStaticMarkup(createElement(Header))),mobileDoc=document(renderToStaticMarkup(createElement(MobileNavigation,{path:pathname})));
const nav=find(mobileDoc,'mobile-nav'),details=nav.getElementsByTagName('details')[0],summary=details.getElementsByTagName('summary')[0];
assert(summary.getAttribute('class').includes('is-active'));
const current=[...nav.getElementsByTagName('a')].filter(a=>a.getAttribute('aria-current')==='page');
assert.equal(current.length,1);assert.equal(current[0].getAttribute('href'),pathname);
const plainLink=[...details.getElementsByTagName('a')].find(a=>!a.hasAttribute('aria-current'));
const results=[];
for(const width of [320,360,375,390,430,768,1024,1040,1041,1280,1440]){
 const header=find(headerDoc,'site-header'),inner=find(headerDoc,'header-inner'),logo=find(headerDoc,'logo'),nav=find(headerDoc,'desktop-navigation'),menu=find(headerDoc,'mobile-menu-button');
 const before={header:styles(header,width),inner:styles(inner,width),logo:styles(logo,width)};
 header.setAttribute('class','site-header is-scrolled');const after={header:styles(header,width),inner:styles(inner,width),logo:styles(logo,width)};header.setAttribute('class','site-header');
 for(const key of ['height','width','margin-top','margin-bottom','gap','transform','display']){assert.equal(after.inner[key],before.inner[key],`inner geometry at ${width}`);assert.equal(after.logo[key],before.logo[key],`logo geometry at ${width}`)}
 assert.equal(before.header.height,width<=760?'65px':'74px');assert.equal(after.header.height,before.header.height);
 const navigation=styles(nav,width),hamburger=styles(menu,width);assert.equal(navigation.display==='none',width<=1040);assert.equal(hamburger.display==='flex',width<=1040);assert.equal(navigation['margin-left'],'auto');
 assert.match(before.header.background,/linear-gradient\(112deg,#12213c/);
 assert.equal(after.header.background,before.header.background);
 assert.equal(before.header.animation,undefined);
 const trigger=nav.getElementsByTagName('button')[0];
 assert.equal(styles(trigger,width).color,'#fff');
 assert.equal(styles(trigger,width,{states:['focus-visible']}).outline,'2px solid #b6e9f5');
 assert.equal(styles(menu,width).color,'#eef4ff');
 assert.equal(styles(menu,width,{states:['active']}).color,'#fff');
 assert(!existsSync('components/site/header-network.tsx'));
 assert(!existsSync('components/site/header-network-engine.ts'));
 const closed=styles(summary,width);details.setAttribute('open','');const opened=styles(summary,width);details.removeAttribute('open');
 assert.match(opened['box-shadow'],/inset 3px/);assert.equal(opened['border-color'],'#c3d7f8');assert.match(styles(summary,width,{states:['active']}).transform,/scale\(\.985\)/);
 assert.notEqual(styles(plainLink,width,{states:['active']}).background,styles(plainLink,width).background);
 assert.match(styles(plainLink,width,{states:['focus-visible']}).outline,/2px solid/);assert.equal(styles(plainLink,width)['min-height'],'44px');
 assert.equal(styles(current[0],width)['border-color'],'#c3d7f8');
 results.push({width,headerHeight:before.header.height,desktopNavigation:width>1040,unchangedScrollGeometry:true,pressAndOpenStyles:true,noCanvas:true,staticHeaderGradient:true,visibleLightControls:true});
}
const brandDoc=document(renderToStaticMarkup(createElement('div',{},createElement(Header),createElement(Footer))));
const gradients=[...brandDoc.getElementsByTagName('linearGradient')].map(el=>el.getAttribute('id'));
assert.equal(gradients.length,2);assert.equal(new Set(gradients).size,2,'Header and footer SVG paints have unique SSR IDs');
const cssText=readFileSync('app/globals.css','utf8');assert(!/header-atmosphere|header-network|header-energy/.test(cssText));
for(const selector of ['body','.hero','.category-section','.page-header','.faq-section','.site-footer']){
 const rule=[...css.nodes].filter(n=>n.type==='rule'&&n.selectors.includes(selector)).at(-1);assert(rule,selector);
 assert(rule.nodes.some(n=>n.prop==='background'&&n.value.includes('gradient(')),selector+' has a static gradient');
}
const rgb=hex=>hex.replace('#','').match(/../g).map(v=>parseInt(v,16));
const mix=(base,top,alpha)=>base.map((v,i)=>v*(1-alpha)+top[i]*alpha);
const lum=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
// Conservative bright bound: simultaneous maxima of the header's radial washes.
let brightHeader=mix(rgb('#223d70'),rgb('#4775ac'),0x18/255);brightHeader=mix(brightHeader,rgb('#365ba9'),0x55/255);
const activeHeader=mix(brightHeader,rgb('#c4dcff'),0x26/255);
const contrast=[['navigation',rgb('#edf3ff'),brightHeader],['active navigation',rgb('#ffffff'),activeHeader],['header controls',rgb('#f5f8ff'),mix(brightHeader,rgb('#d7e6ff'),0x18/255)],['wordmark accent',rgb('#c3e4ff'),brightHeader],['footer links',rgb('#506581'),rgb('#eaf2fc')],['main text',rgb('#15223a'),rgb('#e5edff')],['supporting page text',rgb('#617087'),rgb('#f0f5ff')]].map(([label,foreground,background])=>({label,ratio:ratio(foreground,background)}));
for(const item of contrast)assert(item.ratio>=4.5,item.label+' meets WCAG AA text contrast in the authored conservative color bound');
const result={passed:true,method:'React SSR, limited CSS cascade/state evaluator and authored color contrast bounds; not browser layout or physical-phone testing',renders,responsiveCSS:results,activeRoute:pathname,uniqueLogoPaintIDs:true,contrast,unverified:['physical mobile appearance/tap feedback','actual header overflow','browser reload/slow-network paint','GUI keyboard/menu interactions','browser console and hydration warnings','Core Web Vitals']};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,renders,responsiveWidths:results.map(r=>r.width),method:result.method},null,2));

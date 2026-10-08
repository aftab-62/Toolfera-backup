import {toolDefinitions,toolCategories,popularIds} from './tool-definitions.ts';

const singular:Record<string,string>={images:'image',pdfs:'pdf',photos:'photo',documents:'document'};
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(word=>singular[word]||word).join(' ');
const index=toolDefinitions.map(tool=>({tool,title:normalize(tool.name),aliases:tool.keywords.map(normalize),haystack:normalize([tool.name,tool.category,toolCategories.find(c=>c.slug===tool.category)?.name,...tool.keywords].join(' '))}));

// Ordered phrases distinguish opposite conversions that contain the same words.
export function searchTools(query:string,limit=10){
 const phrase=normalize(query),words=phrase.split(' ').filter(Boolean);
 if(!phrase)return popularIds.map(id=>toolDefinitions.find(t=>t.id===id)!).filter(t=>t?.kind).slice(0,limit);
 return index.filter(entry=>words.every(word=>entry.haystack.includes(word))).map(entry=>{
  const exact=entry.title===phrase?200:entry.aliases.includes(phrase)?170:0;
  const ordered=entry.title.startsWith(phrase)?120:entry.title.includes(phrase)?100:entry.aliases.some(alias=>alias.includes(phrase))?80:0;
  const tokens=words.reduce((score,word)=>score+(entry.title.includes(word)?4:entry.aliases.some(alias=>alias.includes(word))?2:1),0);
  return {tool:entry.tool,score:exact+ordered+tokens};
 }).sort((a,b)=>Number(!!b.tool.kind)-Number(!!a.tool.kind)||b.score-a.score||a.tool.name.localeCompare(b.tool.name)).slice(0,limit).map(entry=>entry.tool);
}

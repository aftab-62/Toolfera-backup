export type CleanupOptions={trim:boolean;collapse:boolean;empty:boolean;ignoreCase:boolean};
export function cleanupText(text:string,kind:'duplicates'|'clean',options:CleanupOptions){
 if(!text.trim())throw new Error('Enter some text first.');if(text.length>200_000)throw new Error('Use at most 200,000 characters at a time.');
 const original=text.replace(/\r\n?/g,'\n').split('\n');let lines=original.map(line=>options.trim?line.trim():line);
 if(kind==='duplicates'){const seen=new Set<string>();lines=lines.filter(line=>{if(options.empty&&!line.trim())return false;const key=options.ignoreCase?line.toLowerCase():line;if(seen.has(key))return false;seen.add(key);return true})}
 else{if(options.collapse)lines=lines.map(line=>line.replace(/[\t\x20\u00a0]+/g,' '));if(options.empty)lines=lines.filter(line=>line.trim());}
 return {text:lines.join('\n'),originalLines:original.length,resultLines:lines.length,removed:original.length-lines.length};
}

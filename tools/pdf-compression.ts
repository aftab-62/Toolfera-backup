export type CompressionLevel='recommended'|'strong'|'quality';
export type CompressionSettings={dpi:number;quality:number};
export const compressionPresets:Record<CompressionLevel,CompressionSettings>={
 recommended:{dpi:144,quality:72},strong:{dpi:96,quality:50},quality:{dpi:192,quality:85}
};
type Candidate={blob:Blob;pages:number;notice?:string};
export type CompressionOutcome=({kind:'compressed';method:'structure'|'image';originalBytes:number;savedBytes:number;savedPercent:number}&Candidate)|{kind:'unchanged';originalBytes:number;pages:number;reason:'optimized'|'features'|'limit'};
export type CompressionEngines={optimize:()=>Promise<Candidate>;analyze:()=>Promise<{allowed:boolean;limited?:boolean}>;raster:(settings:CompressionSettings)=>Promise<Candidate>};

/** Ignore negligible changes and never offer an equal/larger replacement. */
export function meaningfulReduction(originalBytes:number,outputBytes:number){return originalBytes-outputBytes>=Math.max(256,Math.ceil(originalBytes*.01))}
export function compressionSize(bytes:number){return bytes>=1048576?`${(bytes/1048576).toFixed(2)} MB`:bytes>=1024?`${(bytes/1024).toFixed(2)} KB`:`${bytes} B`}

export async function compressPDF(file:File,{level,method='auto',settings}:{level:CompressionLevel;method?:'auto'|'structure'|'image';settings?:CompressionSettings},engines:CompressionEngines,signal:AbortSignal,progress:(text:string)=>void):Promise<CompressionOutcome>{
 const check=()=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError')};
 let best:Candidate|undefined,bestMethod:'structure'|'image'='structure';
 const keep=(candidate:Candidate,method:'structure'|'image')=>{if(meaningfulReduction(file.size,candidate.blob.size)&&(!best||candidate.blob.size<best.blob.size)){best=candidate;bestMethod=method}};
 const outcome=(pages:number,reason:'optimized'|'features'|'limit'='optimized'):CompressionOutcome=>best?{...best,kind:'compressed',method:bestMethod,originalBytes:file.size,savedBytes:file.size-best.blob.size,savedPercent:(file.size-best.blob.size)/file.size*100}:{kind:'unchanged',originalBytes:file.size,pages,reason};
 check();progress('Optimizing the document…');const structural=await engines.optimize();check();keep(structural,'structure');
 const target=level==='strong'?.2:level==='quality'?.05:.1;
 if(method==='structure'||(method==='auto'&&best&&(file.size-best.blob.size)/file.size>=target))return outcome(structural.pages);
 if(structural.pages>40)return outcome(structural.pages,'limit');
 if(method==='auto'){
  progress('Checking whether scanned pages can be reduced…');const profile=await engines.analyze();check();
  if(!profile.allowed)return outcome(structural.pages,profile.limited?'limit':'features');
 }
 const preset=settings||compressionPresets[level];
 const attempts=[preset,{dpi:Math.max(72,Math.round(preset.dpi*(level==='quality'?.875:.83))),quality:Math.max(level==='quality'?78:35,preset.quality-12)}];
 for(let index=0;index<attempts.length;index++){
  check();progress(index?'Trying a smaller scan configuration…':'Preparing scanned pages…');
  // Every attempt reads the original, avoiding repeated lossy recompression.
  const candidate=await engines.raster(attempts[index]);check();keep(candidate,'image');
  if(meaningfulReduction(file.size,candidate.blob.size))break;
 }
 return outcome(structural.pages);
}

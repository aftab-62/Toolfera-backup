const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError')};
const yieldFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));

// Bounded projection analysis only rotates clearly sideways text. Tesseract's
// own rotateAuto handles small skew. Ambiguous/clear pages stay untouched.
export function sidewaysText(data:Uint8ClampedArray,width:number,height:number){
 const rows=new Float64Array(height),columns=new Float64Array(width);let ink=0;
 for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2){const i=(y*width+x)*4,value=(data[i]*.299+data[i+1]*.587+data[i+2]*.114)<145?1:0;rows[y]+=value;columns[x]+=value;ink+=value}
 const score=(profile:Float64Array,length:number)=>{const values=Array.from(profile).filter((_,i)=>i%2===0),mean=values.reduce((n,v)=>n+v,0)/values.length;return values.reduce((n,v)=>n+(v-mean)**2,0)/values.length/(length*length)};
 return ink>80&&ink/(width*height)<.25&&score(columns,height)>score(rows,width)*2.4;
}
export async function prepareOCRImage(bytes:Uint8Array,signal:AbortSignal,progress:(status:string)=>void){
 check(signal);progress('Analyzing text image…');const mobile=window.matchMedia('(max-width:767px)').matches,cap=mobile?1800000:3000000;
 const bitmap=await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>]));
 const source=document.createElement('canvas'),canvas=document.createElement('canvas');
 try{check(signal);const scale=Math.min(Math.max(1,1600/Math.max(bitmap.width,bitmap.height)),Math.sqrt(cap/(bitmap.width*bitmap.height)));
  source.width=Math.max(1,Math.round(bitmap.width*scale));source.height=Math.max(1,Math.round(bitmap.height*scale));const context=source.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('OCR image preparation is unavailable in this browser.');context.fillStyle='#fff';context.fillRect(0,0,source.width,source.height);context.drawImage(bitmap,0,0,source.width,source.height);
  const sample=document.createElement('canvas');let sideways=false;
  try{const ratio=Math.min(1,400/Math.max(source.width,source.height));sample.width=Math.max(1,Math.round(source.width*ratio));sample.height=Math.max(1,Math.round(source.height*ratio));const ctx=sample.getContext('2d',{willReadFrequently:true});if(ctx){ctx.drawImage(source,0,0,sample.width,sample.height);sideways=sidewaysText(ctx.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height)}}finally{sample.width=sample.height=0}
  canvas.width=sideways?source.height:source.width;canvas.height=sideways?source.width:source.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('OCR image preparation is unavailable in this browser.');
  if(sideways){ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);progress('Correcting sideways text…')}ctx.drawImage(source,0,0);ctx.setTransform(1,0,0,1,0,0);source.width=source.height=0;
  const image=ctx.getImageData(0,0,canvas.width,canvas.height),histogram=new Uint32Array(256);let dark=0;
  for(let i=0;i<image.data.length;i+=16){const level=Math.round(image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114);histogram[level]++;if(level<170)dark++}
  const samples=image.data.length/16;let low=0,high=255,count=0;for(let i=0;i<256;i++){count+=histogram[i];if(count>=samples*.001){low=i;break}}count=0;for(let i=255;i>=0;i--){count+=histogram[i];if(count>=samples*.008){high=i;break}}
  const normalize=high-low<170&&high-low>25&&dark/samples>.003;
  // Soft contrast normalization, not hard binarization: preserve faint strokes
  // and already-clear pages. OCR performs its own adaptive thresholding.
  if(normalize){progress('Improving text contrast…');for(let y=0;y<canvas.height;y++){check(signal);for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,level=image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114,value=Math.max(0,Math.min(255,(level-low)*255/(high-low)));image.data[i]=image.data[i+1]=image.data[i+2]=value}if(y%128===0)await yieldFrame()}ctx.putImageData(image,0,0)}
  check(signal);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Unable to prepare the OCR image.')),'image/png'));return{bytes:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height,sideways,upscaled:scale>1,contrast:normalize};
 }finally{bitmap.close();source.width=source.height=canvas.width=canvas.height=0}
}
export async function turnOCRImage(bytes:Uint8Array,signal:AbortSignal){check(signal);const bitmap=await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>])),canvas=document.createElement('canvas');try{canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('OCR image preparation is unavailable in this browser.');ctx.translate(canvas.width,canvas.height);ctx.rotate(Math.PI);ctx.drawImage(bitmap,0,0);check(signal);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to correct text orientation.')),'image/png'));return new Uint8Array(await blob.arrayBuffer())}finally{bitmap.close();canvas.width=canvas.height=0}}

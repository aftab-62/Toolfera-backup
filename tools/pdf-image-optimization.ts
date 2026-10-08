import {PDFDocument,PDFImage,PDFRawStream,PDFName} from 'pdf-lib';
import {unzlibSync,zlibSync} from 'fflate';
export type ImagePDFMode='quality'|'recommended'|'smallest';
export const imagePDFPresets={quality:{dpi:280,quality:.92},recommended:{dpi:168,quality:.8},smallest:{dpi:108,quality:.62}};
export type ImagePDFStats={width:number;height:number;effectiveDPI:number;strategy:string;quality?:number};

// PNG predictors preserve correlation between neighbouring pixels, which the
// stock RGB PDF embedder otherwise discards. Keep alpha as a lossless mask.
async function embedLossless(doc:PDFDocument,bytes:Uint8Array){
 const image=await doc.embedPng(bytes);await image.embed();
 const stream=doc.context.lookup(image.ref);if(!(stream instanceof PDFRawStream))throw new Error('Unable to encode this PNG.');
 const encode=(ref:typeof image.ref,object:PDFRawStream,channels:number)=>{
  const width=object.dict.get(PDFName.of('Width'))!.toString(),height=object.dict.get(PDFName.of('Height'))!.toString();
  const row=Number(width)*channels,raw=unzlibSync(object.getContents()),filtered=new Uint8Array(raw.length+Number(height));
  for(let y=0;y<Number(height);y++){const start=y*row,dest=y*(row+1);filtered[dest]=2;for(let x=0;x<row;x++)filtered[dest+1+x]=(raw[start+x]-(y?raw[start-row+x]:0)+256)&255}
  const compressed=zlibSync(filtered,{level:6});if(compressed.length>=object.getContents().length)return;
  const dict=object.dict.clone();dict.set(PDFName.of('DecodeParms'),doc.context.obj({Predictor:15,Colors:channels,BitsPerComponent:8,Columns:Number(width)}));doc.context.assign(ref,PDFRawStream.of(dict,compressed));
 };
 encode(image.ref,stream,3);const mask=stream.dict.get(PDFName.of('SMask'));if(mask){const object=doc.context.lookup(mask);if(object instanceof PDFRawStream)encode(mask as typeof image.ref,object,1)}return image;
}

export async function optimizedPDFImage(doc:PDFDocument,bytes:Uint8Array,header:{width:number;height:number;mime:string},drawWidth:number,drawHeight:number,mode:ImagePDFMode){
 const preset=imagePDFPresets[mode]||imagePDFPresets.recommended;
 const scale=Math.min(1,drawWidth*preset.dpi/72/header.width,drawHeight*preset.dpi/72/header.height);
 const width=Math.max(1,Math.floor(header.width*scale)),height=Math.max(1,Math.floor(header.height*scale));
 const stats:ImagePDFStats={width,height,effectiveDPI:Math.min(width/drawWidth,height/drawHeight)*72,strategy:'Original JPEG'};
 // Small, appropriately sized JPEGs already contain efficient DCT streams.
 if(header.mime==='image/jpeg'&&scale===1&&(mode==='quality'||bytes.length/(width*height)<.18))return {image:await doc.embedJpg(bytes),stats};
 if(typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined'){
  stats.width=header.width;stats.height=header.height;stats.effectiveDPI=Math.min(header.width/drawWidth,header.height/drawHeight)*72;stats.strategy=header.mime==='image/png'?'Lossless PNG (browser fallback)':'Original JPEG (browser fallback)';
  return {image:header.mime==='image/png'?await embedLossless(doc,bytes):await doc.embedJpg(bytes),stats};
 }
 const bitmap=await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>],{type:header.mime}),{imageOrientation:'none'}),sample=new OffscreenCanvas(96,96),canvas=new OffscreenCanvas(width,height);
 try{
  const probe=sample.getContext('2d',{willReadFrequently:true}),ctx=canvas.getContext('2d',{willReadFrequently:true});if(!probe||!ctx)throw new Error('Image processing is unavailable.');
  probe.drawImage(bitmap,0,0,96,96);const pixels=probe.getImageData(0,0,96,96).data,colors=new Set<number>();let chromatic=0,edges=0,documentBackground=0;
  for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];colors.add((r>>4)*256+(g>>4)*16+(b>>4));if(Math.min(r,g,b)>245||Math.max(r,g,b)<18)documentBackground++;if(Math.max(r,g,b)-Math.min(r,g,b)>20)chromatic++;if(i>=4&&Math.abs(r-pixels[i-4])+Math.abs(g-pixels[i-3])+Math.abs(b-pixels[i-2])>150)edges++}
  ctx.drawImage(bitmap,0,0,width,height);let alpha=false;
  // Inspect every alpha value in small strips; thumbnail sampling alone can
  // miss thin transparent details. Avoid a second full-size RGBA allocation.
  if(header.mime==='image/png')for(let y=0;y<height&&!alpha;y+=64){const data=ctx.getImageData(0,y,width,Math.min(64,height-y)).data;for(let i=3;i<data.length;i+=4)if(data[i]!==255){alpha=true;break}}
  const photographic=documentBackground<pixels.length/4*.45&&colors.size>300&&chromatic>pixels.length/4*.08&&edges<pixels.length/4*.25;
  const jpeg=header.mime==='image/jpeg'||(!alpha&&photographic);
  const blob=await canvas.convertToBlob({type:jpeg?'image/jpeg':'image/png',quality:preset.quality});let encoded:Uint8Array=new Uint8Array(await blob.arrayBuffer());
  if(!jpeg&&scale===1)encoded=bytes;
  stats.strategy=jpeg?'JPEG optimized':alpha?'Lossless PNG with alpha':'Lossless PNG graphics/text';if(jpeg)stats.quality=preset.quality;
  return {image:jpeg?await doc.embedJpg(encoded):await embedLossless(doc,encoded),stats};
 }finally{bitmap.close();canvas.width=canvas.height=sample.width=sample.height=0}
}

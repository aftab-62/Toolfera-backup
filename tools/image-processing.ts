export const imageFormats=[{mime:'image/jpeg',label:'JPEG',ext:'jpg'},{mime:'image/png',label:'PNG',ext:'png'},{mime:'image/webp',label:'WebP',ext:'webp'},{mime:'image/avif',label:'AVIF',ext:'avif'},{mime:'image/bmp',label:'BMP',ext:'bmp'}] as const;
export type ResizeMode='fit'|'fill'|'stretch';
export type CropRect={x:number;y:number;width:number;height:number};
export type ImageSettings={width:number;height:number;mode:ResizeMode;mime:string;quality:number;crop?:CropRect};
export function validateCrop(sourceWidth:number,sourceHeight:number,crop:CropRect){
 if(![crop.x,crop.y,crop.width,crop.height].every(Number.isInteger)||crop.x<0||crop.y<0||crop.width<1||crop.height<1||crop.x+crop.width>sourceWidth||crop.y+crop.height>sourceHeight)throw new Error('Choose whole-number crop dimensions that stay inside the image.');
 return crop;
}
export type ImageMetadata={width:number;height:number;bytes:number;mime:string};
export type ProcessedImage=ImageMetadata&{blob:Blob};
export function dimensions(sourceWidth:number,sourceHeight:number,width:number,height:number,mode:ResizeMode){
 if(![sourceWidth,sourceHeight,width,height].every(n=>Number.isInteger(n)&&n>0))throw new Error('Enter whole-number dimensions of at least 1 pixel.');
 if(width>8000||height>8000)throw new Error('Each output dimension must be at most 8,000 pixels.');
 const scale=mode==='fit'?Math.min(width/sourceWidth,height/sourceHeight):Math.max(width/sourceWidth,height/sourceHeight);
 const outWidth=mode==='fit'?Math.max(1,Math.round(sourceWidth*scale)):width;
 const outHeight=mode==='fit'?Math.max(1,Math.round(sourceHeight*scale)):height;
 if(outWidth*outHeight>16000000)throw new Error('Reduce the dimensions. The output limit is 16 million pixels.');
 return {width:outWidth,height:outHeight,drawWidth:mode==='stretch'?width:sourceWidth*scale,drawHeight:mode==='stretch'?height:sourceHeight*scale};
}
export const formatLabel=(mime:string)=>imageFormats.find(f=>f.mime===mime)?.label||(mime==='image/gif'?'GIF':mime.replace('image/','').toUpperCase());
export const fileSize=(n:number)=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
// A simple 24-bit BMP encoder. JPEG/BMP export composites transparency onto white.
export function encodeBMP(pixels:Uint8ClampedArray,width:number,height:number){
 const stride=Math.ceil(width*3/4)*4,buffer=new ArrayBuffer(54+stride*height),view=new DataView(buffer),bytes=new Uint8Array(buffer);
 bytes[0]=66;bytes[1]=77;view.setUint32(2,buffer.byteLength,true);view.setUint32(10,54,true);view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,stride*height,true);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const src=(y*width+x)*4,dst=54+(height-1-y)*stride+x*3;bytes[dst]=pixels[src+2];bytes[dst+1]=pixels[src+1];bytes[dst+2]=pixels[src];}
 return new Blob([buffer],{type:'image/bmp'});
}

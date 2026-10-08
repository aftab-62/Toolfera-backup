import {FileInputError} from './file-input.ts';
export function inspectImageHeader(bytes:Uint8Array,maxPixels=40_000_000){
 const ascii=new TextDecoder().decode(bytes.subarray(0,32)),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let mime='',width=0,height=0;
 if(bytes[0]===255&&bytes[1]===216){mime='image/jpeg';let p=2;while(p+8<bytes.length){if(bytes[p]!==255){p++;continue}const marker=bytes[p+1];if(marker===0xda||marker===0xd9)break;if(marker===0x00||marker===0xff){p++;continue}const length=v.getUint16(p+2);if(length<2||p+2+length>bytes.length)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){height=v.getUint16(p+5);width=v.getUint16(p+7);break}p+=2+length}}
 else if(bytes[0]===137&&ascii.slice(1,4)==='PNG'){
  if(bytes.length<33||bytes[4]!==13||bytes[5]!==10||bytes[6]!==26||bytes[7]!==10||v.getUint32(8)!==13||ascii.slice(12,16)!=='IHDR')throw new FileInputError('This image is damaged or unreadable. Choose a valid PNG file.');
  mime='image/png';width=v.getUint32(16);height=v.getUint32(20);
  if(!width||!height)throw new FileInputError('This image is damaged or unreadable. Choose a valid PNG file.');
 }
 else if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')mime='image/webp';
 else if(ascii.startsWith('GIF8')&&bytes.length>=10){mime='image/gif';width=v.getUint16(6,true);height=v.getUint16(8,true)}
 else if(ascii.startsWith('BM')&&bytes.length>=26){mime='image/bmp';width=Math.abs(v.getInt32(18,true));height=Math.abs(v.getInt32(22,true))}
 else if(ascii.slice(4,8)==='ftyp'&&/avif|avis/.test(ascii))mime='image/avif';
 if(!mime)throw new FileInputError('Choose a readable JPEG, PNG, WebP, AVIF, BMP or GIF image. HEIC and TIFF are not supported.');
 if(width&&height&&(!Number.isSafeInteger(width*height)||width*height>maxPixels))throw new FileInputError(`This image exceeds the ${maxPixels/1_000_000} million pixel limit. Resize it on your device before selecting it.`);
 return {mime,width,height};
}

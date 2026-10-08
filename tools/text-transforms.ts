export function transformText(text:string,action:string){
 if(text.length>2000000)throw new Error('Use text smaller than 2 million characters.');
 if(action==='upper')return text.toUpperCase();if(action==='lower')return text.toLowerCase();
 if(action==='title')return text.toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(_,gap,letter)=>gap+letter.toUpperCase());
 if(action==='sentence')return text.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu,(_,gap,letter)=>gap+letter.toUpperCase());
 if(action==='base64-encode'){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary)}
 if(action==='base64-decode'){const clean=text.replace(/\s/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)||clean.length%4===1)throw new Error('Enter valid standard Base64 text.');try{return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(clean),c=>c.charCodeAt(0)))}catch{throw new Error('This value is invalid Base64 or does not contain UTF-8 text. Binary files are not supported.')}}
 if(action==='url-encode'){try{return encodeURIComponent(text)}catch{throw new Error('The text contains an incomplete Unicode character. Replace it and try again.')}}
 if(action==='url-decode'){try{return decodeURIComponent(text)}catch{throw new Error('Enter a valid percent-encoded URL component, using % followed by two hex digits.')}}
 throw new Error('Choose a supported text operation.');
}

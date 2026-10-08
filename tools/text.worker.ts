import {transformText} from './text-transforms.ts';
import {textStats} from './math.ts';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(data:unknown)=>void};
scope.onmessage=({data})=>{try{if(data.action==='transform')scope.postMessage({id:data.id,result:transformText(data.text,data.operation)});else if(data.action==='count')scope.postMessage({id:data.id,result:textStats(data.text)});else{if(data.text.length>2000000)throw new Error('Use JSON smaller than 2 million characters.');scope.postMessage({id:data.id,result:JSON.stringify(JSON.parse(data.text),null,data.minify?undefined:2)})}}catch(e){scope.postMessage({id:data.id,error:e instanceof Error?e.message:'Unable to process this text.'})}};

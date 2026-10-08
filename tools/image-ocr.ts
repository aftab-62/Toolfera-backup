import {createOCRWorker} from './ocr-worker-client.ts';
import {prepareOCRImage,turnOCRImage} from './ocr-preprocess.ts';
import {ocrPageLayout,structuredOCR} from './ocr-layout.ts';
export async function recognizeImage(bytes:Uint8Array,signal:AbortSignal,progress:(status:string)=>void){
 const prepared=await prepareOCRImage(bytes,signal,progress),worker=createOCRWorker(signal,(status,fraction)=>progress(status==='recognizing text'?`Reading English text${typeof fraction==='number'?` · ${Math.round(fraction*100)}%`:''}`:status==='loading language traineddata'?'Loading English language…':'Preparing OCR engine…'));
 try{await worker.initialize('eng');let result=await worker.recognize(prepared.bytes.slice());
  if(prepared.sideways&&result.confidence<65){progress('Checking text orientation…');const alternate=await worker.recognize(await turnOCRImage(prepared.bytes,signal));if(alternate.confidence>result.confidence)result=alternate}
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');if(result.text.replace(/\s/g,'').length<3)throw new Error('No readable English text was found. Try a clearer, upright image.');if(result.text.length>200000)throw new Error('The recognized text exceeds 200,000 characters. Crop a smaller area.');
  const landscape=prepared.width>prepared.height,width=landscape?841.89:595.28,height=landscape?595.28:841.89,scale=Math.max(prepared.width/width,prepared.height/height),structured=structuredOCR([ocrPageLayout(result,width,height,scale)],['OCR text may contain recognition errors. Review names, numbers and formatting.']);
  return{...structured,confidence:result.confidence,preparation:{sideways:prepared.sideways,upscaled:prepared.upscaled,contrast:prepared.contrast}};
 }finally{worker.dispose()}
}

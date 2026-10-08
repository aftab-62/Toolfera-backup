import type {Page as OCRPage} from 'tesseract.js';
import {reconstructWord,type PDFWordPage,type PDFWordText,type WordBlock,type WordDocument} from './pdf-word-layout.ts';

// Recognized words retain their source line/paragraph geometry. No invented
// words, spelling corrections or absolute-position text fragments are added.
export function ocrPageLayout(result:OCRPage,width:number,height:number,scale=1):PDFWordPage{
 const text:PDFWordText[]=[];
 for(const [bi,block] of (result.blocks||[]).entries())for(const [pi,paragraph] of block.paragraphs.entries())for(const line of paragraph.lines){
  // A glyph box is shorter than the font's em square. Treating glyph height
  // as a smaller font scattered consecutive OCR lines into separate paragraphs.
  const bounds=line.bbox,size=Math.max(6,(bounds.y1-bounds.y0)*1.15/scale),key=`${bi}:${pi}`,plain=line.text.trim();
  const headingHint=text.length===0&&plain.length<110&&/[A-Z]{3}/.test(plain)&&plain===plain.toUpperCase()?1:undefined;
  const words=line.words?.filter(word=>word.text.trim())||[];
  for(const word of words.length?words:[{text:line.text.trim(),bbox:bounds}]){if(!word.text.trim())continue;const b=word.bbox;text.push({text:word.text.trim(),x:b.x0/scale,y:bounds.y0/scale,baseline:bounds.y1/scale,width:(b.x1-b.x0)/scale,size,font:'Arial',bold:!!headingHint,italic:false,rtl:!paragraph.is_ltr,paragraphKey:key,headingHint})}
 }
 if(!text.length&&result.text.trim()){
  // Older engine output can lack boxes. Keep paragraphs readable, flagging
  // this fallback rather than pretending source geometry was recovered.
  let y=36;for(const [i,line] of result.text.trim().split(/\r?\n/).entries()){if(!line.trim()){y+=12;continue}text.push({text:line.trim(),x:36,y,baseline:y+11,width:Math.min(width-72,line.length*5.5),size:11,font:'Arial',bold:false,italic:false,rtl:false,paragraphKey:String(i)});y+=15}
 }
 return{width,height,text,images:[]};
}
export function structuredOCR(pages:PDFWordPage[],warnings:string[]=[]):{document:WordDocument;text:string}{
 const document=reconstructWord(pages,warnings);
 const plain=(blocks:WordBlock[]):string=>blocks.map(block=>{
  if(block.type==='paragraph'){const value=block.runs.map(run=>run.break?'\n':run.text).join('');return (block.list==='bullet'?'• ':block.list==='decimal'?`${block.listStart||1}. `:'')+value}
  if(block.type==='columns')return block.columns.map(column=>plain(column.blocks)).join('\n\n');
  if(block.type==='table')return block.rows.map(row=>row.map(runs=>runs.map(run=>run.text).join('').trim()).join('\t')).join('\n');
  return'';
 }).filter(Boolean).join('\n\n');
 return{document,text:document.pages.map(page=>plain(page.blocks)).join('\n\n\f\n\n')};
}

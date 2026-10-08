import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {PDFRun,Paragraph,Picture,WordPDFModel,PageLayout} from './word-pdf-model';
import {renderDocxPDF} from './word-docx-render.ts';
type Segment=PDFRun&{font:PDFFont;width:number};type Line={segments:Segment[];height:number;width:number};
export async function renderWordPDF(model:WordPDFModel,fontBytes:Uint8Array[],progress:(message:string)=>void){
 if(model.source==='docx')return renderDocxPDF(model,fontBytes,progress);
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const fonts=await Promise.all(fontBytes.map(bytes=>pdf.embedFont(bytes,{subset:true})));const supported=new Set(fonts[0].getCharacterSet()),warnings=new Set(model.warnings);let page!:PDFPage,y=0,sectionFirstPage=1,layout:PageLayout=model;
 let content=layout.width-layout.left-layout.right,bottom=layout.bottom,top=layout.height-layout.top;
 const geometry=(next:PageLayout)=>{layout=next;content=next.width-next.left-next.right;bottom=next.bottom;top=next.height-next.top};
 function newPage(){if(pdf.getPageCount()>=100)throw new Error('This DOCX would exceed 100 PDF pages. Convert a smaller document.');page=pdf.addPage([layout.width,layout.height]);y=top;progress(`Generating PDF page ${pdf.getPageCount()}…`);decoratePage()}
 const choose=(run:PDFRun)=>fonts[Number(!!run.bold)+2*Number(!!run.italic)];
 function clean(text:string){return Array.from(text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')).map(c=>supported.has(c.codePointAt(0)!)?c:(warnings.add('Unsupported font characters were replaced with ?. Review non-Latin text.'),'?')).join('')}
 function wrap(p:Paragraph,width:number):Line[]{const lines:Line[]=[];let current:Line={segments:[],height:0,width:0};const flush=()=>{current.height=Math.max(.5,current.height||(p.lineRule==='exact'?p.line:(p.size||11)*1.2*Math.max(.5,p.line||1)));lines.push(current);current={segments:[],height:0,width:0}};
  for(const run of p.runs){const font=choose(run),text=clean(run.text),height=p.lineRule==='exact'?p.line:p.lineRule==='atLeast'?Math.max(p.line,run.size*1.2):p.line>4?p.line:run.size*1.2*Math.max(.5,p.line);for(const token of text.split(/(\n|[^\S\n]+)/u).filter(Boolean)){if(token==='\n'){flush();continue}const size=font.widthOfTextAtSize(token,run.size);if(!token.trim()&&!current.segments.length)continue;if(current.width+size>width&&current.segments.length)flush();if(size>width&&token.trim()){let fragment='';for(const char of token){if(fragment&&font.widthOfTextAtSize(fragment+char,run.size)>width){const w=font.widthOfTextAtSize(fragment,run.size);current.segments.push({...run,text:fragment,font,width:w});current.width+=w;current.height=Math.max(current.height,height);flush();fragment=''}fragment+=char}if(fragment){const w=font.widthOfTextAtSize(fragment,run.size);current.segments.push({...run,text:fragment,font,width:w});current.width+=w;current.height=Math.max(current.height,height)}}else{current.segments.push({...run,text:token,font,width:size});current.width+=size;current.height=Math.max(current.height,height)}}}if(current.segments.length||!lines.length)flush();return lines;
 }
 function drawLine(line:Line,left:number,width:number,align:Paragraph['align'],baseline:number,justify=false){let x=left+(align==='right'?Math.max(0,width-line.width):align==='center'?Math.max(0,(width-line.width)/2):0);const spaces=line.segments.filter(s=>!s.text.trim()).length,extra=justify&&align==='justify'&&spaces?Math.max(0,width-line.width)/spaces:0;for(const s of line.segments){const hex=s.color||'17243B',color=rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);page.drawText(s.text,{x,y:baseline,size:s.size,font:s.font,color});if(s.underline&&s.text.trim())page.drawLine({start:{x,y:baseline-1.5},end:{x:x+s.width,y:baseline-1.5},thickness:.6,color});x+=s.width+(!s.text.trim()?extra:0)}}
 function decoratePage(){const first=pdf.getPageCount()===sectionFirstPage;const header=first&&layout.firstHeaders?layout.firstHeaders:layout.headers,footer=first&&layout.firstFooters?layout.firstFooters:layout.footers;
  const draw=(paragraphs:Paragraph[]|undefined,start:number)=>{let cursor=start;for(const p of paragraphs||[]){cursor-=p.before;for(const line of wrap(p,content)){drawLine(line,layout.left,content,p.align,cursor-Math.max(...line.segments.map(s=>s.size),p.size||11));cursor-=line.height}cursor-=p.after}};
  draw(header,layout.height-(layout.headerDistance??24));const footerHeight=(footer||[]).reduce((n,p)=>n+p.before+p.after+wrap(p,content).reduce((v,l)=>v+l.height,0),0);draw(footer,(layout.footerDistance??24)+footerHeight);
 }
 function paragraph(p:Paragraph,next?:Paragraph){if(p.pageBreak&&y<top-.5)newPage();const indent=Math.min(content-24,Math.max(-layout.left,p.indent)),first=Math.max(-indent,Math.min(content-indent-24,p.firstLine||0)),width=Math.max(24,content-indent-Math.max(0,p.rightIndent||0)),lines=wrap(p,width-Math.max(0,first));
  const height=lines.reduce((n,l)=>n+l.height,0),nextHeight=p.keepNext&&next?next.before+wrap(next,content-Math.max(0,next.indent))[0].height:0;
  if(y<top-.5&&((p.keepLines||p.keepNext)&&p.before+height+nextHeight<=top-bottom&&y-p.before-height-nextHeight<bottom||y-p.before-lines[0].height<bottom))newPage();
  y-=p.before;for(const [i,line] of lines.entries()){if(y-line.height<bottom)newPage();const maxSize=Math.max(...line.segments.map(s=>s.size),p.size||11);drawLine(line,layout.left+indent+(i===0?first:0),width-(i===0?first:0),p.align,y-maxSize,i<lines.length-1);y-=line.height}y-=p.after;
 }
 const images=new Map<Uint8Array,Awaited<ReturnType<typeof pdf.embedPng>>>();
 async function embed(p:Picture){let image=images.get(p.bytes);if(!image){try{image=await(p.mime==='image/png'?pdf.embedPng(p.bytes):pdf.embedJpg(p.bytes));images.set(p.bytes,image)}catch{throw new Error('A DOCX image is damaged or unsupported. Use valid PNG or JPEG images.')}}return image}
 async function picture(p:Picture){const image=await embed(p),scale=Math.min(1,content/p.width,(top-bottom)/p.height),width=p.width*scale,height=p.height*scale;if(p.position){const x=p.position.x+(p.position.horizontal==='margin'?layout.left:0),fromTop=p.position.y+(p.position.vertical==='margin'?layout.top:0);page.drawImage(image,{x,y:layout.height-fromTop-height,width,height});return}if(y-height<bottom)newPage();page.drawImage(image,{x:layout.left,y:y-height,width,height});y-=height}
 newPage();
 for(const [index,block] of model.blocks.entries()){if(block.type==='section'){if(block.start==='initial'){geometry(block.layout);continue}const previous=model.blocks[index-1],different=block.layout.width!==layout.width||block.layout.height!==layout.height;geometry(block.layout);sectionFirstPage=pdf.getPageCount()+1;if(block.start!=='continuous'||different){if(previous?.type==='break'&&y===top&&!different){sectionFirstPage=pdf.getPageCount()}else newPage();if(block.start==='oddPage'&&pdf.getPageCount()%2===0||block.start==='evenPage'&&pdf.getPageCount()%2===1){sectionFirstPage=pdf.getPageCount()+1;newPage()}}continue}if(block.type==='break'){if(block.source!=='saved'||y<top-.5)newPage();continue}if(block.type==='paragraph'){const next=model.blocks[index+1];paragraph(block,next?.type==='paragraph'?next:undefined);continue}if(block.type==='image'){await picture(block);continue}
  if(block.type!=='table')continue;
  const columns=Math.max(...block.rows.map(r=>r.cells.reduce((n,c)=>n+c.span,0)));if(columns>20||block.rows.length>1000)throw new Error('This table is too large. Use at most 20 columns and 1,000 rows.');const original=Array.from({length:columns},(_,i)=>block.widths[i]||content/columns),sum=original.reduce((n,v)=>n+v,0),scale=Math.min(1,(content-(block.indent||0))/sum),widths=original.map(v=>v*scale);
  for(const row of block.rows){let column=0;
   type Entry={height:number;line?:Line;align?:Paragraph['align'];image?:Awaited<ReturnType<typeof embed>>;width?:number};
   const cells=await Promise.all(row.cells.map(async cell=>{const width=widths.slice(column,column+cell.span).reduce((n,v)=>n+v,0);column+=cell.span;const entries:Entry[]=[];
    for(const p of cell.paragraphs){if(p.before>0)entries.push({height:p.before});entries.push(...wrap({...p,indent:0},Math.max(12,width-12)).map(line=>({height:line.height,line,align:p.align})));if(p.after>0)entries.push({height:p.after})}
    for(const picture of cell.images||[]){const image=await embed(picture),scale=Math.min(1,(width-12)/picture.width,(top-bottom-12)/picture.height);entries.push({image,width:picture.width*scale,height:picture.height*scale})}
    return{width,entries};
   }));
   const total=Math.max(...cells.map(c=>c.entries.length),1),entryHeight=(i:number)=>Math.max(...cells.map(c=>c.entries[i]?.height||0),1),rowHeight=Math.max(row.minHeight||0,Array.from({length:total},(_,i)=>entryHeight(i)).reduce((n,v)=>n+v,12));
   if(rowHeight<=top-bottom&&y-rowHeight<bottom)newPage();let cursor=0;
   while(cursor<total){let count=0,height=12;
    while(cursor+count<total){const next=entryHeight(cursor+count);if(next+12>top-bottom)throw new Error('A table line cannot fit this page size.');if(height+next>top-bottom&&count)break;if(y-height-next<bottom){if(!count){newPage();continue}break}height+=next;count++}
    if(!count)throw new Error('A table row cannot fit the page.');if(cursor===0&&cursor+count>=total)height=Math.max(height,Math.min(top-bottom,row.minHeight||0));let x=layout.left+(block.indent||0);
    for(const cell of cells){page.drawRectangle({x,y:y-height,width:cell.width,height,borderColor:rgb(.78,.82,.89),borderWidth:.5,color:row.header?rgb(.94,.96,.99):undefined});let entryY=y-6;
     for(let n=0;n<count;n++){const entry=cell.entries[cursor+n];if(entry?.line)drawLine(entry.line,x+6,cell.width-12,entry.align||'left',entryY-Math.max(...entry.line.segments.map(s=>s.size),11));else if(entry?.image)page.drawImage(entry.image,{x:x+6,y:entryY-entry.height,width:entry.width!,height:entry.height});entryY-=entryHeight(cursor+n)}x+=cell.width;
    }y-=height;cursor+=count;if(cursor<total)newPage();
   }
  }

 }
 const bytes=await pdf.save();if(bytes.length>40*1048576)throw new Error('The PDF exceeds 40 MB. Use fewer images or pages.');return{blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/pdf'}),pages:pdf.getPageCount(),warnings:[...warnings]};
}

import {PDFDocument,StandardFonts,rgb,pushGraphicsState,popGraphicsState,concatTransformationMatrix,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {WordPDFModel,WordPDFBlock,Paragraph,PDFRun,PageLayout,Picture,Table,Frame} from './word-pdf-model.ts';
import {wordBaseline} from './pdf-editable-docx.ts';

type Segment=PDFRun&{font:PDFFont;width:number;scale:number};
type Line={segments:Segment[];width:number;height:number;size:number};
type Rectangle={x:number;top:number;width:number;bottom:number};

// DOCX layout is deliberately separate from the invoice renderer. In particular,
// a floating object's paragraphs own their runs, geometry and independent cursor.
export async function renderDocxPDF(model:WordPDFModel,fontBytes:Uint8Array[],progress:(message:string)=>void){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const sans=await Promise.all(fontBytes.map(bytes=>pdf.embedFont(bytes,{subset:true})));
 const serif=await Promise.all([StandardFonts.TimesRoman,StandardFonts.TimesRomanBold,StandardFonts.TimesRomanItalic,StandardFonts.TimesRomanBoldItalic].map(name=>pdf.embedFont(name)));
 const mono=await Promise.all([StandardFonts.Courier,StandardFonts.CourierBold,StandardFonts.CourierOblique,StandardFonts.CourierBoldOblique].map(name=>pdf.embedFont(name)));
 const warnings=new Set(model.warnings),sets=new Map<PDFFont,Set<number>>();
 const charset=(font:PDFFont)=>{let set=sets.get(font);if(!set){set=new Set(font.getCharacterSet());sets.set(font,set)}return set};
 const choose=(run:PDFRun)=>{
  const style=Number(!!run.bold)+2*Number(!!run.italic);
  const font=(run.fontFamily==='serif'?serif:run.fontFamily==='mono'?mono:sans)[style];
  if(Array.from(run.text).some(c=>!/[\s]/u.test(c)&&!charset(font).has(c.codePointAt(0)!))&&font!==sans[style]){warnings.add('Some characters use a compatible sans-serif fallback font.');return sans[style]}
  return font;
 };
 function segment(run:PDFRun,text:string):Segment{
  const font=choose(run),allowed=charset(font);
  const clean=Array.from(text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')).map(c=>allowed.has(c.codePointAt(0)!)?c:(warnings.add('Unsupported font characters were replaced with ?. Review non-Latin text.'),'?')).join('');
  const raw=font.widthOfTextAtSize(clean,run.size);
  const full=font.widthOfTextAtSize(run.text.replace(/[\n\t]/g,''),run.size);
  const scale=run.fitWidth&&full>0?run.fitWidth/full:1;
  return{...run,text:clean,font,scale,width:Math.max(0,raw*scale+(run.spacing||0)*Math.max(0,clean.length-1))};
 }
 function wrap(p:Paragraph,width:number):Line[]{
  const lines:Line[]=[];let line:Line={segments:[],width:0,height:0,size:0};
  const flush=()=>{
   line.size=line.size||p.size||11;
   const natural=line.size*1.2;
   line.height=p.lineRule==='exact'?Math.max(.05,p.line):p.lineRule==='atLeast'?Math.max(natural,p.line):natural*Math.max(.5,p.line||1);
   if(line.segments.some(s=>s.text.trim())&&line.height<line.size*.75){warnings.add('An invalid tiny text line height was increased to prevent overlapping text.');line.height=natural}
   lines.push(line);line={segments:[],width:0,height:0,size:0};
  };
  for(const run of p.runs){
   for(const token of run.text.split(/(\n|\t|[^\S\n\t]+)/u).filter(Boolean)){
    if(token==='\n'){flush();continue}
    if(token==='\t'){
     // OOXML paragraph tab positions are relative to the section margin,
     // while this line's cursor begins at the paragraph's left indent.
     const stop=p.tabs?.find(t=>t.position-p.indent>line.width+.2);
     const position=stop?stop.position-p.indent:(Math.floor(line.width/36)+1)*36;
     // An invisible segment reserves the actual tab-stop width.
     const tab=segment(run,'');tab.width=Math.max(0,position-line.width);line.segments.push(tab);line.width+=tab.width;continue;
    }
    const part=segment(run,token);
    if(line.width+part.width>width+.75&&line.segments.some(s=>s.text.trim()))flush();
    if(part.width>width+.75&&token.trim()){
     let text='';for(const char of token){if(text&&segment(run,text+char).width>width){const piece=segment(run,text);line.segments.push(piece);line.width+=piece.width;line.size=Math.max(line.size,run.size);flush();text=''}text+=char}
     if(text){const piece=segment(run,text);line.segments.push(piece);line.width+=piece.width;line.size=Math.max(line.size,run.size)}
    }else{line.segments.push(part);line.width+=part.width;line.size=Math.max(line.size,run.size)}
   }
  }
  if(line.segments.length||!lines.length)flush();return lines;
 }
 const color=(hex='000000')=>/^[a-f\d]{6}$/i.test(hex)?rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255):rgb(0,0,0);
 let page!:PDFPage,layout:PageLayout=model,cursor=0,sectionFirstPage=1;
 const body=():Rectangle=>({x:layout.left,top:layout.top,width:layout.width-layout.left-layout.right,bottom:layout.height-layout.bottom});
 function lineAt(line:Line,x:number,fromTop:number,width:number,align:Paragraph['align'],justify=false){
  let left=x+(align==='center'?(width-line.width)/2:align==='right'?width-line.width:0);
  const spaces=line.segments.filter(s=>s.text&&!s.text.trim()).length,extra=justify&&align==='justify'&&spaces?Math.max(0,width-line.width)/spaces:0;
  const baseline=layout.height-fromTop-wordBaseline(line.size,line.height);
  for(const item of line.segments){
   if(item.text){
    // The native w:fitText width is a run metric, not an absolute text box.
    // Apply it as a local horizontal transform; the PDF keeps genuine text.
    const natural=item.font.widthOfTextAtSize(item.text,item.size),stretch=natural?item.width/natural:1;
    page.pushOperators(pushGraphicsState(),concatTransformationMatrix(stretch,0,0,1,left,baseline));
    page.drawText(item.text,{x:0,y:0,font:item.font,size:item.size,color:color(item.color)});page.pushOperators(popGraphicsState());
    if(item.underline&&item.text.trim())page.drawLine({start:{x:left,y:baseline-1.5},end:{x:left+item.width,y:baseline-1.5},thickness:.6,color:color(item.color)});
   }
   left+=item.width+(item.text&&!item.text.trim()?extra:0);
  }
 }
 function decoration(paragraphs:Paragraph[]|undefined,x:number,start:number,width:number){let y=start;for(const p of paragraphs||[]){y+=p.before;for(const line of wrap(p,width)){lineAt(line,x,y,width,p.align);y+=line.height}y+=p.after}}
 function newPage(){
  if(pdf.getPageCount()>=100)throw new Error('This DOCX would exceed 100 PDF pages. Convert a smaller document.');
  page=pdf.addPage([layout.width,layout.height]);cursor=layout.top;progress(`Generating PDF page ${pdf.getPageCount()}…`);
  const first=pdf.getPageCount()===sectionFirstPage,headers=first&&layout.firstHeaders?layout.firstHeaders:layout.headers,footers=first&&layout.firstFooters?layout.firstFooters:layout.footers;
  decoration(headers,layout.left,layout.headerDistance??24,body().width);
  const footerHeight=(footers||[]).reduce((n,p)=>n+p.before+p.after+wrap(p,body().width).reduce((sum,l)=>sum+l.height,0),0);
  decoration(footers,layout.left,layout.height-(layout.footerDistance??24)-footerHeight,body().width);
 }
 function paragraph(p:Paragraph,rect:Rectangle,y:number,paginate:boolean,next?:Paragraph){
  if(p.pageBreak&&paginate&&y>rect.top+.5){newPage();y=cursor;rect=body()}
  const indent=Math.max(-rect.x,p.indent),first=p.firstLine||0,width=Math.max(12,rect.width-indent-(p.rightIndent||0));
  const lines=wrap(p,Math.max(12,width-Math.max(0,first))),height=lines.reduce((n,l)=>n+l.height,0);
  const nextHeight=p.keepNext&&next?next.before+wrap(next,rect.width)[0].height:0;
  if(paginate&&y>rect.top+.5&&((p.keepLines||p.keepNext)&&height+p.before+nextHeight<=rect.bottom-rect.top&&y+p.before+height+nextHeight>rect.bottom||y+p.before+lines[0].height>rect.bottom)){newPage();y=cursor;rect=body()}
  y+=p.before;
  for(const [i,line] of lines.entries()){
   if(paginate&&y+line.height>rect.bottom+.1){newPage();y=cursor;rect=body()}
   lineAt(line,rect.x+indent+(i===0?first:0),y,width-(i===0?first:0),p.align,i<lines.length-1);y+=line.height;
  }
  return y+p.after;
 }
 const images=new Map<Uint8Array,Awaited<ReturnType<typeof pdf.embedPng>>>();
 async function embed(p:Picture){let image=images.get(p.bytes);if(!image){try{image=await(p.mime==='image/png'?pdf.embedPng(p.bytes):pdf.embedJpg(p.bytes));images.set(p.bytes,image)}catch{throw new Error('A DOCX image is damaged or unsupported. Use valid PNG or JPEG images.')}}return image}
 async function picture(p:Picture,rect:Rectangle,y:number,paginate:boolean){
  const image=await embed(p);
  if(p.position){const x=p.position.x+(p.position.horizontal==='margin'?layout.left:0),top=p.position.y+(p.position.vertical==='margin'?layout.top:0);page.drawImage(image,{x,y:layout.height-top-p.height,width:p.width,height:p.height});return y}
  const scale=Math.min(1,rect.width/p.width,(rect.bottom-rect.top)/p.height),height=p.height*scale;
  if(paginate&&y+height>rect.bottom){newPage();y=cursor;rect=body()}
  page.drawImage(image,{x:rect.x,y:layout.height-y-height,width:p.width*scale,height});return y+height;
 }
 async function table(t:Table,rect:Rectangle,y:number,paginate:boolean){
  const columns=Math.max(...t.rows.map(row=>row.cells.reduce((n,c)=>n+c.span,0)),0);
  if(columns>20||t.rows.length>1000)throw new Error('This table is too large. Use at most 20 columns and 1,000 rows.');
  const original=Array.from({length:columns},(_,i)=>t.widths[i]||rect.width/columns),sum=original.reduce((n,v)=>n+v,0),factor=Math.min(1,(rect.width-(t.indent||0))/sum),widths=original.map(v=>v*factor);
  for(const row of t.rows){
   let column=0;
   const cells=await Promise.all(row.cells.map(async c=>{
    const width=widths.slice(column,column+c.span).reduce((n,v)=>n+v,0);column+=c.span;
    const margins=c.margins||{left:5.4,right:5.4,top:0,bottom:0};
    const paragraphs=c.paragraphs.map(p=>({p,lines:wrap(p,Math.max(12,width-margins.left-margins.right-p.indent-(p.rightIndent||0)))}));
    const pictures=await Promise.all((c.images||[]).map(async p=>({p,image:await embed(p),scale:Math.min(1,(width-margins.left-margins.right)/p.width)})));
    const height=margins.top+margins.bottom+paragraphs.reduce((n,{p,lines})=>n+p.before+p.after+lines.reduce((sum,l)=>sum+l.height,0),0)+pictures.reduce((n,{p,scale})=>n+p.height*scale,0);
    return{c,width,margins,paragraphs,pictures,height};
   }));
   const natural=Math.max(...cells.map(c=>c.height),.05),height=row.exactHeight&&row.minHeight?row.minHeight:Math.max(row.minHeight||0,natural);
   if(height>rect.bottom-rect.top+.1)throw new Error('A table row cannot fit this page size. Split large rows in Word first.');
   if(paginate&&y+height>rect.bottom+.1){newPage();y=cursor;rect=body()}
   if(natural>height+.75)warnings.add('Text exceeds an exact-height table row. Review that row in Word.');
   let x=rect.x+(t.indent||0);
   for(const cell of cells){
    const borders=cell.c.borders||{};
    const coordinates={top:{start:{x,y:layout.height-y},end:{x:x+cell.width,y:layout.height-y}},bottom:{start:{x,y:layout.height-y-height},end:{x:x+cell.width,y:layout.height-y-height}},left:{start:{x,y:layout.height-y},end:{x,y:layout.height-y-height}},right:{start:{x:x+cell.width,y:layout.height-y},end:{x:x+cell.width,y:layout.height-y-height}}};
    for(const [edge,border] of Object.entries(borders))if(border)page.drawLine({...coordinates[edge as keyof typeof coordinates],thickness:border.width,color:color(border.color)});
    let cellY=y+cell.margins.top;
    for(const {p,lines} of cell.paragraphs){cellY+=p.before;for(const [i,line] of lines.entries()){lineAt(line,x+cell.margins.left+p.indent+(i===0?(p.firstLine||0):0),cellY,cell.width-cell.margins.left-cell.margins.right-p.indent,p.align,i<lines.length-1);cellY+=line.height}cellY+=p.after}
    for(const {p,image,scale} of cell.pictures){page.drawImage(image,{x:x+cell.margins.left,y:layout.height-cellY-p.height*scale,width:p.width*scale,height:p.height*scale});cellY+=p.height*scale}
    x+=cell.width;
   }
   y+=height;
  }
  return y;
 }
 async function frame(f:Frame){
  const x=f.x+(f.horizontal==='margin'?layout.left:0),top=f.y+(f.vertical==='margin'?layout.top:0);
  const rect={x,top,width:f.width,bottom:top+f.height};let y=top;
  for(const [i,block] of f.blocks.entries())y=await renderBlock(block,rect,y,false,f.blocks[i+1]);
  if(y>rect.bottom+1)warnings.add('A floating text object exceeds its saved height. Review complex objects in Word.');
 }
 async function renderBlock(block:WordPDFBlock,rect:Rectangle,y:number,paginate:boolean,next?:WordPDFBlock):Promise<number>{
  if(block.type==='paragraph')return paragraph(block,rect,y,paginate,next?.type==='paragraph'?next:undefined);
  if(block.type==='image')return picture(block,rect,y,paginate);
  if(block.type==='table')return table(block,rect,y,paginate);
  if(block.type==='frame'){await frame(block);return y}
  if(block.type==='rule'){page.drawLine({start:{x:block.x1,y:layout.height-block.y1},end:{x:block.x2,y:layout.height-block.y2},thickness:block.width,color:color(block.color)});return y}
  if(block.type==='break'){if(paginate&&(block.source!=='saved'||y>rect.top+.5)){newPage();return cursor}return y}
  return y;
 }
 // Use the initial section before the first page, including headers/margins.
 if(model.blocks[0]?.type==='section')layout=model.blocks[0].layout;
 newPage();
 for(const [i,block] of model.blocks.entries()){
  if(block.type==='section'){
   if(block.start==='initial'){layout=block.layout;continue}
   const previous=model.blocks[i-1],different=block.layout.width!==layout.width||block.layout.height!==layout.height;
   layout=block.layout;sectionFirstPage=pdf.getPageCount()+1;
   if(block.start!=='continuous'||different){
    if(previous?.type==='break'&&cursor===layout.top&&!different)sectionFirstPage=pdf.getPageCount();else newPage();
    if(block.start==='oddPage'&&pdf.getPageCount()%2===0||block.start==='evenPage'&&pdf.getPageCount()%2===1){sectionFirstPage=pdf.getPageCount()+1;newPage()}
   }
   continue;
  }
  cursor=await renderBlock(block,body(),cursor,true,model.blocks[i+1]);
 }
 const bytes=await pdf.save();if(bytes.length>40*1048576)throw new Error('The PDF exceeds 40 MB. Use fewer images or pages.');
 return{blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/pdf'}),pages:pdf.getPageCount(),warnings:[...warnings]};
}

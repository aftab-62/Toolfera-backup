// Geometry-based reconstruction. PDF rarely contains paragraph/table semantics.
export type WordRun={text:string;font:string;size:number;bold?:boolean;italic?:boolean;rtl?:boolean;break?:boolean};
export type PDFWordText={text:string;x:number;y:number;baseline:number;width:number;size:number;font:string;bold:boolean;italic:boolean;rtl:boolean;paragraphKey?:string;headingHint?:number};
export type WordImage={bytes:Uint8Array;x:number;y:number;width:number;height:number};
export type PDFWordPage={width:number;height:number;text:PDFWordText[];images:WordImage[]};
export type WordParagraph={type:'paragraph';runs:WordRun[];x:number;y:number;size:number;heading?:number;list?:'bullet'|'decimal';listStart?:number;listGroup?:number;after:number;rtl:boolean;align?:'left'|'center'|'right'|'justify';height?:number;lineHeight?:number;width?:number;paragraphKey?:string};
export type WordTable={type:'table';rows:WordRun[][][];widths:number[];x:number;y:number;header:boolean;rowHeights?:number[];height?:number};
export type WordPicture={type:'image';image:WordImage;x:number;y:number};
export type WordColumns={type:'columns';columns:{x:number;width:number;blocks:WordBlock[]}[];x:number;y:number;height:number};
export type WordBlock=WordParagraph|WordTable|WordPicture|WordColumns;
export type WordPage={width:number;height:number;left:number;right:number;top:number;blocks:WordBlock[]};
export type WordDocument={pages:WordPage[];warnings:string[];summary:{paragraphs:number;headings:number;tables:number;images:number;pages:number}};
type Line={items:PDFWordText[];x:number;y:number;baseline:number;right:number;size:number};
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]||0};
const height=(block:WordBlock)=>block.type==='image'?block.image.height:block.height||Math.max(12,block.type==='paragraph'?block.size*1.25:24);
function runs(items:PDFWordText[]):WordRun[]{
 const out:WordRun[]=[];let previous:PDFWordText|undefined;
 for(const item of items){const gap=previous?item.x-previous.x-previous.width:0;
  if(previous&&gap>Math.min(previous.size,item.size)*.15&&!/\s$/.test(previous.text)&&!/^\s/.test(item.text))out.push({text:' ',font:item.font,size:item.size});
  out.push({text:item.text,font:item.font,size:item.size,bold:item.bold,italic:item.italic,rtl:item.rtl});previous=item;
 }return out;
}
function cells(line:Line){const groups:PDFWordText[][]=[];for(const item of line.items){const g=groups.at(-1),previous=g?.at(-1);if(!previous||item.x-previous.x-previous.width>Math.max(20,line.size*2))groups.push([item]);else g!.push(item)}return groups}
function text(rs:WordRun[]){return rs.map(r=>r.text).join('')}
export function reconstructWord(pages:PDFWordPage[],warnings:string[]=[]):WordDocument{
 if(!pages.length||pages.length>40)throw new Error('Choose a PDF with 1–40 pages.');
 const weights=new Map<number,number>();let characters=0;
 for(const page of pages)for(const item of page.text){characters+=item.text.length;const size=Math.round(item.size);weights.set(size,(weights.get(size)||0)+item.text.trim().length)}
 if(characters>200000)throw new Error('This document has too much text. Convert a smaller selection of pages.');
 if(!pages.some(p=>p.text.some(item=>item.text.trim())))throw new Error('This PDF appears to be scanned. Use OCR to extract editable text.');
 const body=[...weights].sort((a,b)=>b[1]-a[1])[0]?.[0]||11;
 const summary={paragraphs:0,headings:0,tables:0,images:0,pages:pages.length};let listGroup=0;
 const output=pages.map(page=>{
  const lines:Line[]=[];
  for(const item of [...page.text].filter(i=>i.text.trim()).sort((a,b)=>a.baseline-b.baseline||a.x-b.x)){
   let line=lines.at(-1);if(!line||Math.abs(line.baseline-item.baseline)>Math.max(2,item.size*.22)){line={items:[],x:item.x,y:item.y,baseline:item.baseline,right:item.x+item.width,size:item.size};lines.push(line)}
   line.items.push(item);line.x=Math.min(line.x,item.x);line.y=Math.min(line.y,item.y);line.right=Math.max(line.right,item.x+item.width);line.size=Math.max(line.size,item.size);
  }for(const line of lines)line.items.sort((a,b)=>a.x-b.x);
  const left=Math.max(0,Math.min(54,Math.min(...lines.map(l=>l.x),...page.images.map(i=>i.x),54)));
  const right=Math.max(0,Math.min(54,page.width-Math.max(...lines.map(l=>l.right),...page.images.map(i=>i.x+i.width),page.width-54)));
  const top=Math.max(0,Math.min(54,Math.min(...lines.map(l=>l.y),...page.images.map(i=>i.y),54)));
  const makeLine=(items:PDFWordText[]):Line=>({items,x:Math.min(...items.map(i=>i.x)),y:Math.min(...items.map(i=>i.y)),baseline:median(items.map(i=>i.baseline)),right:Math.max(...items.map(i=>i.x+i.width)),size:median(items.map(i=>i.size))});
  // A repeated wide gutter between substantial text distinguishes columns from
  // compact tabular rows. Spanning headings remain above/below the column group.
  const gutterCandidates=lines.flatMap(line=>{const groups=cells(line);return groups.length===2&&groups.every(g=>g.map(i=>i.text).join('').trim().length>=28)?[{left:groups[0].at(-1)!.x+groups[0].at(-1)!.width,right:groups[1][0].x,y:line.y}]:[]});
  const gutter=gutterCandidates.length>=3?median(gutterCandidates.map(g=>(g.left+g.right)/2)):0;
  const columnStart=gutter?Math.min(...gutterCandidates.map(g=>g.y)):Infinity,columnEnd=gutter?Math.max(...lines.filter(l=>l.y>=columnStart&&cells(l).length===2).map(l=>l.y))+body*2:-Infinity;
  function assemble(input:Line[],regionLeft:number,regionRight:number):WordBlock[]{const blocks:WordBlock[]=[];
   const leading=median(input.slice(1).map((l,i)=>l.baseline-input[i].baseline).filter(n=>n>=body*.9&&n<=body*1.7))||body*1.2;
   for(let index=0;index<input.length;){const line=input[index],groups=cells(line),rowGroups=[groups];let next=index+1;
    if(groups.length>=2&&groups.length<=6&&groups.some(g=>g.map(i=>i.text).join('').length<28)){
     while(next<input.length){const candidate=cells(input[next]),previous=input[next-1];if(candidate.length!==groups.length||input[next].baseline-previous.baseline>Math.max(34,line.size*2.4)||candidate.some((g,i)=>Math.abs(g[0].x-groups[i][0].x)>12))break;rowGroups.push(candidate);next++}
    }
    if(rowGroups.length>=3){const starts=groups.map(g=>g[0].x),end=Math.max(...input.slice(index,next).map(l=>l.right));const widths=starts.map((x,i)=>Math.max((starts[i+1]??end+8)-x,Math.max(...rowGroups.map(row=>row[i].at(-1)!.x+row[i].at(-1)!.width-row[i][0].x))+8));const rowHeights=input.slice(index,next).map((l,i)=>i<next-index-1?input[index+i+1].y-l.y:l.size*1.4);
     blocks.push({type:'table',rows:rowGroups.map(row=>row.map(runs)),widths,x:line.x,y:line.y,header:groups.every(g=>g.some(i=>i.bold)),rowHeights,height:rowHeights.reduce((n,v)=>n+v,0)});summary.tables++;index=next;continue;
    }
    const rs=runs(line.items),plain=text(rs),match=plain.match(/^\s*(?:(\d+)[.)]|([•●▪◦\-]))\s+/u),heading=line.items.find(item=>item.headingHint)?.headingHint??(line.size>=body*1.25&&plain.length<180?(line.size>=body*1.7?1:2):undefined);
    const center=Math.abs((line.x+line.right)/2-(regionLeft+regionRight)/2)<8,align=center&&line.right-line.x<(regionRight-regionLeft)*.8?'center':line.items.some(i=>i.rtl)?'right':'left';
    const paragraph:WordParagraph={type:'paragraph',runs:rs,x:line.x,y:line.y,size:line.size,heading,after:0,rtl:line.items.some(i=>i.rtl),align,height:line.size*1.2,lineHeight:Math.max(line.size,Math.min(leading,line.size*1.6)),width:line.right-line.x,paragraphKey:line.items[0]?.paragraphKey};
    if(match){paragraph.list=match[1]?'decimal':'bullet';paragraph.listStart=match[1]?Number(match[1]):undefined;const previous=blocks.at(-1);const continuous=previous?.type==='paragraph'&&previous.list===paragraph.list&&(paragraph.list!=='decimal'||paragraph.listStart===(previous.listStart||1)+1);paragraph.listGroup=continuous?previous.listGroup:++listGroup;let remove=match[0].length;for(const r of rs){const amount=Math.min(remove,r.text.length);r.text=r.text.slice(amount);remove-=amount;if(!remove)break}}
    const previous=blocks.at(-1),previousLine=input[index-1],nearImage=page.images.some(i=>i.y>(previous?.y??-1)&&i.y<line.y);
    const gap=previousLine?line.baseline-previousLine.baseline:Infinity,indentChange=previousLine?Math.abs(previousLine.x-line.x):Infinity;
    const sameOCRParagraph=!paragraph.paragraphKey||paragraph.paragraphKey===(previous?.type==='paragraph'?previous.paragraphKey:undefined)||gap<=leading*1.25&&gap<=line.size*1.75;
    if(previous?.type==='paragraph'&&!heading&&!previous.heading&&!paragraph.list&&!previous.list&&!nearImage&&sameOCRParagraph&&Math.abs(previous.size-line.size)<1.5&&indentChange<Math.max(8,body*.9)&&gap<=Math.max(leading*1.25,line.size*1.5)&&align===previous.align){previous.runs.push({text:'',font:rs[0]?.font||'Calibri',size:line.size,break:true},...rs);previous.height=line.y-previous.y+line.size*1.2;previous.lineHeight=gap;previous.width=Math.max(previous.width||0,line.right-previous.x)}
    else{blocks.push(paragraph);summary.paragraphs++;if(heading)summary.headings++}index++;
   }return blocks;
  }
  let blocks:WordBlock[]=[];
  if(gutter){const columnLines=lines.filter(l=>l.y>=columnStart&&l.y<columnEnd),outside=lines.filter(l=>!columnLines.includes(l)),leftLines:Line[]=[],rightLines:Line[]=[];
   for(const line of columnLines){const a=line.items.filter(i=>i.x+i.width/2<gutter),b=line.items.filter(i=>i.x+i.width/2>=gutter);if(a.length)leftLines.push(makeLine(a));if(b.length)rightLines.push(makeLine(b))}
   const lx=Math.min(...leftLines.map(l=>l.x)),rx=Math.min(...rightLines.map(l=>l.x)),end=Math.max(...rightLines.map(l=>l.right));
   const a=assemble(leftLines,lx,gutter),b=assemble(rightLines,rx,end);blocks=assemble(outside,left,page.width-right);
   blocks.push({type:'columns',x:lx,y:columnStart,height:Math.max(...[...a,...b].map(block=>block.y+height(block)))-columnStart,columns:[{x:lx,width:rx-lx,blocks:a},{x:rx,width:page.width-right-rx,blocks:b}]});
  }else blocks=assemble(lines,left,page.width-right);
  for(const image of page.images){const column=blocks.find(b=>b.type==='columns'&&image.y>=b.y&&image.y<b.y+b.height) as WordColumns|undefined;if(column){const target=column.columns.find(c=>image.x>=c.x&&image.x<c.x+c.width);target?.blocks.push({type:'image',image,x:image.x,y:image.y})}else blocks.push({type:'image',image,x:image.x,y:image.y});summary.images++}
  blocks.sort((a,b)=>a.y-b.y||a.x-b.x);for(const block of blocks)if(block.type==='columns')for(const column of block.columns)column.blocks.sort((a,b)=>a.y-b.y||a.x-b.x);
  return{width:page.width,height:page.height,left,right,top,blocks};
 });
 return{pages:output,warnings:[...new Set(warnings)],summary};
}

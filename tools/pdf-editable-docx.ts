import {zipSync,strToU8} from 'fflate';
import type {EditablePage,NativeLine,NativeText,NativeTable} from './pdf-editable-layout.ts';
const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const r='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml=(body:string)=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body;
const escape=(s:string)=>s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const twips=(pt:number)=>Math.round(pt*20),emu=(pt:number)=>Math.round(pt*12700);
const pt=(n:number)=>Math.round(n*1000)/1000;
// Exact paragraph leading centers the font's line metrics within the line box.
// Main-story paragraphs compensate that leading with normal flow spacing.
export const wordBaseline=(size:number,leading:number)=>leading*.5+size*.35+Math.max(0,leading-size*1.15)*.3;

export function packageEditablePDF(pages:EditablePage[],signal:AbortSignal){
 const entries:Record<string,Uint8Array>={},rels:string[]=[];let shape=0,image=0;
 // Native content establishes a usable left margin for normal blank paragraphs.
 // Paragraph/table indents compensate it, leaving physical placement unchanged.
 const leftMargin=(page:EditablePage)=>Math.max(0,Math.min(page.width*.25,...page.paragraphs.map(p=>p.x),...page.tables.map(t=>t.x)));
 const section=(page:EditablePage)=>`<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${twips(page.width)}" w:h="${twips(page.height)}"${page.width>page.height?' w:orient="landscape"':''}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="${twips(leftMargin(page))}" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="0"/></w:sectPr>`;
 function run(item:NativeText){return`<w:r><w:rPr><w:rFonts w:ascii="${escape(item.font)}" w:hAnsi="${escape(item.font)}" w:eastAsia="${escape(item.font)}" w:cs="${escape(item.font)}"/>${item.bold?'<w:b/>':''}${item.italic?'<w:i/>':''}${item.rtl?'<w:rtl/>':''}<w:color w:val="${item.color}"/><w:sz w:val="${Math.max(2,Math.round(item.size*2))}"/><w:szCs w:val="${Math.max(2,Math.round(item.size*2))}"/></w:rPr><w:t xml:space="preserve">${escape(item.text)}</w:t></w:r>`;}
 function paragraph(lines:NativeLine[],origin:number,leading:number,before=0,heading=false,indent=0){
  if(!lines.length)return'<w:p><w:pPr><w:spacing w:after="0" w:line="1" w:lineRule="exact"/></w:pPr></w:p>';
  let content='';
  for(const [number,line]of lines.entries()){
   if(number)content+='<w:r><w:br/></w:r>';
   let previous:NativeText|undefined,pending:NativeText|undefined;
   const flush=()=>{if(pending){content+=run(pending);pending=undefined}};
   for(const item of line.items){
    // Coordinates identify a word boundary, never a fixed Word width/tab.
    // Word must close gaps naturally when characters are deleted or inserted.
    let text=item.text.replace(/\s+/g,' ');
    if(!text.trim()){if(pending&&!pending.text.endsWith(' '))pending.text+=' ';previous=item;continue;}
    if(!previous)text=text.trimStart();
    if(previous&&pending&&!pending.text.endsWith(' ')&&!text.startsWith(' ')&&item.x-previous.x-previous.width>Math.max(.6,Math.min(item.size,previous.size)*.16))text=' '+text;
    if(pending&&pending.font===item.font&&pending.size===item.size&&pending.bold===item.bold&&pending.italic===item.italic&&pending.color===item.color&&pending.rtl===item.rtl)pending.text+=text;
    else{flush();pending={...item,text};}
    previous=item;
   }
   if(pending)pending.text=pending.text.trimEnd();flush();
  }
  return`<w:p><w:pPr>${heading?'<w:pStyle w:val="Heading2"/>':''}<w:keepNext w:val="0"/><w:keepLines w:val="0"/><w:widowControl w:val="0"/><w:spacing w:before="${Math.max(0,twips(before))}" w:after="0" w:line="${Math.max(1,twips(leading))}" w:lineRule="exact"/><w:ind w:left="${twips(indent)}"/><w:jc w:val="left"/></w:pPr>${content}</w:p>`;
 }
 function tableXML(table:NativeTable,margin=0){
  const widths=table.columns.slice(1).map((x,i)=>x-table.columns[i]);
  const ruled=(y:number)=>table.rules.some(rule=>Math.abs(rule.y1-y)<.7);
  const none='<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>';
  return`<w:tbl><w:tblPr><w:tblW w:w="${twips(table.width)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="${twips(table.x-margin)}" w:type="dxa"/><w:tblBorders>${none}</w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(x=>`<w:gridCol w:w="${twips(x)}"/>`).join('')}</w:tblGrid>${table.rows.map((row,index)=>`<w:tr><w:trPr><w:cantSplit/>${index===0&&table.header?'<w:tblHeader/>':''}<w:trHeight w:val="${twips(row.height)}" w:hRule="exact"/></w:trPr>${row.cells.map((cell,column)=>{
   const first=cell.lines[0],leading=cell.lines.length>1?cell.lines[1].baseline-first.baseline:(first?.size||10)*1.15;
   const before=first?Math.max(0,first.baseline-row.top-wordBaseline(first.size,leading)):0;
   const border=(edge:string,visible:boolean)=>`<w:${edge} w:val="${visible?'single':'nil'}"${visible?' w:sz="4" w:color="'+(table.grid?'D1D5DB':'000000')+'"':''}/>`;
   return`<w:tc><w:tcPr><w:tcW w:w="${twips(widths[column])}" w:type="dxa"/><w:tcBorders>${border('top',table.grid||index===0||(index>1&&ruled(row.top)))}${border('bottom',table.grid||index===0||index===table.rows.length-1||ruled(row.top+row.height))}${border('left',table.grid)}${border('right',table.grid)}</w:tcBorders><w:vAlign w:val="top"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(cell.lines,table.columns[column],leading,before)}</w:tc>`;
  }).join('')}</w:tr>`).join('')}</w:tbl><w:p><w:pPr><w:spacing w:line="1" w:lineRule="exact" w:after="0"/></w:pPr></w:p>`;
 }
 const body=pages.map((page,index)=>{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');let content='';
  for(const rule of page.rules){const id=++shape;content+=`<w:r><w:pict><v:line id="Rule${id}" style="position:absolute;mso-position-horizontal-relative:page;mso-position-vertical-relative:page;z-index:${id}" from="${pt(rule.x1)}pt,${pt(rule.y1)}pt" to="${pt(rule.x2)}pt,${pt(rule.y2)}pt" strokecolor="#${rule.color}" strokeweight="${pt(Math.max(.2,rule.width))}pt"><w10:wrap type="none"/></v:line></w:pict></w:r>`;}
  for(const graphic of page.graphics){
   if(!graphic.bytes)continue;const id=++image,rid='rIdImage'+id,name=`graphic-${id}.png`,cx=emu(graphic.width),cy=emu(graphic.height);entries['word/media/'+name]=graphic.bytes;rels.push(`<Relationship Id="${rid}" Type="${r}/image" Target="media/${name}"/>`);
   content+=`<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${++shape}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${emu(graphic.x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${emu(graphic.y)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${shape}" name="PDF ${graphic.kind} ${id}" descr="Localized source ${graphic.kind}; surrounding text remains editable."/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  }
  // Only rules/images are page-anchored. Every ordinary paragraph and table
  // is a direct body child in the one continuous Word main story.
  const graphics=`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/><w:widowControl w:val="0"/></w:pPr>${content}</w:p>`;
  content=graphics;let cursor=.05;
  const spacer=(height:number)=>`<w:p><w:pPr><w:keepNext w:val="0"/><w:keepLines w:val="0"/><w:widowControl w:val="0"/><w:spacing w:before="0" w:after="0" w:line="${Math.max(1,twips(height))}" w:lineRule="exact"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${Math.max(2,Math.round(Math.min(11,height*.75)*2))}"/></w:rPr></w:pPr></w:p>`;
  const blocks=[...page.paragraphs.map(p=>({type:'paragraph' as const,y:p.lines[0].baseline-wordBaseline(p.lines[0].size,p.leading),p})),...page.tables.map(t=>({type:'table' as const,y:t.y,t}))].sort((a,b)=>a.y-b.y);
  for(const block of blocks){
   // Empty paragraphs are real insertion points in intentional blank areas.
   // Use modest line boxes, rather than one inaccessible enormous gap.
   let gap=Math.max(0,block.y-cursor);
   while(gap>.075){const height=Math.min(14,gap);content+=spacer(height);cursor+=Math.round(height*20)/20;gap=block.y-cursor;}
   if(block.type==='paragraph'){
    content+=paragraph(block.p.lines,block.p.x,block.p.leading,0,block.p.heading,block.p.x-leftMargin(page));
    cursor+=Math.round(block.p.leading*20)/20*block.p.lines.length;
   }else{content+=tableXML(block.t,leftMargin(page));cursor+=block.t.rows.reduce((n,row)=>n+Math.round(row.height*20)/20,0)+.05;}
  }
  // A section boundary closes this source page even when it is mostly blank.
  if(index<pages.length-1)content+=`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/><w:widowControl w:val="0"/>${section(page)}</w:pPr></w:p>`;
  return content;
 }).join('')+section(pages[pages.length-1]);
 const parts:Record<string,string>={
  '[Content_Types].xml':xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`),
  '_rels/.rels':xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="${r}/officeDocument" Target="word/document.xml"/></Relationships>`),
  'word/document.xml':xml(`<w:document xmlns:w="${w}" xmlns:r="${r}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`),
  'word/_rels/document.xml.rels':xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${r}/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="${r}/settings" Target="settings.xml"/>${rels.join('')}</Relationships>`),
  'word/styles.xml':xml(`<w:styles xmlns:w="${w}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0"/><w:widowControl w:val="0"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr></w:style></w:styles>`),
  'word/settings.xml':xml(`<w:settings xmlns:w="${w}"><w:doNotAutoCompressPictures/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`),
 };
 for(const[name,value]of Object.entries(parts))entries[name]=strToU8(value);
 const bytes=zipSync(entries,{level:1});if(bytes.length>40*1048576)throw new Error('This Word document exceeds 40 MB. Split the PDF into smaller parts.');
 return new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

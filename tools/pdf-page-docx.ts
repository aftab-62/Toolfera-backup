import {zipSync,strToU8} from 'fflate';

export type RenderedWordPage={width:number;height:number;png:Uint8Array};
const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const r='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml=(body:string)=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body;
const twips=(points:number)=>Math.round(points*20);
const emu=(points:number)=>Math.round(points*12700);
const contentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** A fixed page image, not editable paragraph reconstruction. No OCR or text layer. */
export function packagePDFPages(pages:RenderedWordPage[],signal:AbortSignal):Blob{
 if(!pages.length||pages.length>40)throw new Error('Choose a PDF with 1 to 40 pages.');
 const entries:Record<string,Uint8Array>={},relationships:string[]=[];let totalBytes=0;
 function section(page:RenderedWordPage){return`<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${twips(page.width)}" w:h="${twips(page.height)}"${page.width>page.height?' w:orient="landscape"':''}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="0"/><w:docGrid w:linePitch="1"/></w:sectPr>`}
 const body=pages.map((page,index)=>{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  if(!Number.isFinite(page.width)||!Number.isFinite(page.height)||page.width<=0||page.height<=0||page.width>1584||page.height>1584)throw new Error('This PDF page size is not supported by Word. Use pages up to 22 inches per side.');
  totalBytes+=page.png.byteLength;if(totalBytes>40*1048576)throw new Error('The high-resolution Word document exceeds 40 MB. Split this PDF into smaller parts.');
  const id=index+1,name=`page-${id}.png`,rid=`rIdPage${id}`,cx=emu(page.width),cy=emu(page.height);
  entries['word/media/'+name]=page.png;relationships.push(`<Relationship Id="${rid}" Type="${r}/image" Target="media/${name}"/>`);
  // One tiny, nonprinting anchor paragraph per source page. The image is fixed
  // to physical page (0,0) and has no wrapping, margins or text flow to reflow.
  return`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/><w:widowControl w:val="0"/>${index<pages.length-1?section(page):''}</w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="PDF page ${id}" descr="Complete source PDF page ${id}. Visual layout preserved as an image."/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}" cstate="none"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
 }).join('')+section(pages[pages.length-1]);
 const parts:Record<string,string>={
  '[Content_Types].xml':xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`),
  '_rels/.rels':xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="${r}/officeDocument" Target="word/document.xml"/></Relationships>`),
  'word/document.xml':xml(`<w:document xmlns:w="${w}" xmlns:r="${r}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`),
  'word/_rels/document.xml.rels':xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${r}/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="${r}/settings" Target="settings.xml"/>${relationships.join('')}</Relationships>`),
  'word/styles.xml':xml(`<w:styles xmlns:w="${w}"><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="2"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/><w:widowControl w:val="0"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`),
  'word/settings.xml':xml(`<w:settings xmlns:w="${w}"><w:doNotAutoCompressPictures/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`)
 };
 for(const[name,value]of Object.entries(parts))entries[name]=strToU8(value);
 // PNG pages are already losslessly compressed. STORE avoids recompressing
 // tens of megabytes synchronously and preserves the original PNG bytes.
 const bytes=zipSync(entries,{level:0});if(bytes.length>40*1048576)throw new Error('The high-resolution Word document exceeds 40 MB. Split this PDF into smaller parts.');
 return new Blob([bytes as Uint8Array<ArrayBuffer>],{type:contentType});
}

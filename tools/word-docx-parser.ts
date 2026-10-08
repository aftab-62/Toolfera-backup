import type {WordPDFModel,WordPDFBlock,PDFRun,Paragraph,Picture,Table,PageLayout,Frame,Rule,CellMargins,Border} from './word-pdf-model';
const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const descendants=(el:Element|Document|null,name:string)=>el?Array.from(el.getElementsByTagNameNS(w,name)):[];
const child=(el:Element|null,name:string)=>el?Array.from(el.children).find(x=>x.namespaceURI===w&&x.localName===name)||null:null;
const val=(el:Element|null,name='val')=>el?.getAttributeNS(w,name)||'';
const num=(el:Element|null,name='val',fallback=0)=>{const raw=val(el,name);return raw!==''&&Number.isFinite(Number(raw))?Number(raw):fallback};
const pt=(el:Element|null,name='val',fallback=0)=>num(el,name,fallback*20)/20;
const toggle=(el:Element|null)=>!!el&&!['0','false','off'].includes(val(el));
function xml(bytes:Uint8Array|undefined){if(!bytes)return null;const text=new TextDecoder().decode(bytes);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('This DOCX contains unsupported XML declarations.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('This DOCX contains damaged XML.');return doc}
export async function parseDOCX(entries:Record<string,Uint8Array>,signal:AbortSignal,progress:(message:string)=>void):Promise<WordPDFModel>{
 const document=xml(entries['word/document.xml']);if(!document)throw new Error('Choose a valid DOCX document.');const body=descendants(document,'body')[0];if(!body)throw new Error('This DOCX has no document body.');const styleDoc=xml(entries['word/styles.xml']),numberDoc=xml(entries['word/numbering.xml']),relDoc=xml(entries['word/_rels/document.xml.rels']);
 const warnings=new Set<string>(['Compatible PDF fonts are substituted where necessary. Review font differences and complex layouts.']);const styles=new Map(descendants(styleDoc,'style').map(style=>[val(style,'styleId'),style]));
 function styleChain(id:string,seen=new Set<string>()):Element[]{if(seen.size>15||seen.has(id))return[];seen.add(id);const s=styles.get(id);return s?[...styleChain(val(child(s,'basedOn')),seen),s]:[]}
 const defaultRun=descendants(styleDoc,'rPrDefault')[0]?.getElementsByTagNameNS(w,'rPr')[0]||null;
 const defaultPara=descendants(styleDoc,'pPrDefault')[0]?.getElementsByTagNameNS(w,'pPr')[0]||null;
 const numbering=new Map(descendants(numberDoc,'num').map(n=>[val(n,'numId'),n]));const abstract=new Map(descendants(numberDoc,'abstractNum').map(n=>[val(n,'abstractNumId'),n]));const counters=new Map<string,number>();
 const relationships=new Map(relDoc?Array.from(relDoc.getElementsByTagNameNS('*','Relationship')).filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>[r.getAttribute('Id')||'',r.getAttribute('Target')||'']):[]);
 function image(drawing:Element):Picture|null{const blip=drawing.getElementsByTagNameNS('*','blip')[0],id=blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed'),target=id&&relationships.get(id);if(!target)return null;const path=target.startsWith('/')?target.slice(1):'word/'+target.replace(/^\.\//,'');const bytes=entries[path];if(!bytes)return null;const mime=bytes[0]===137&&bytes[1]===80?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':null;if(!mime){warnings.add('An unsupported image was omitted. PNG and JPEG are supported.');return null}const extent=drawing.getElementsByTagNameNS('*','extent')[0];return{type:'image',bytes,mime,width:Math.max(1,Number(extent?.getAttribute('cx')||1270000)/12700),height:Math.max(1,Number(extent?.getAttribute('cy')||1270000)/12700),...position(drawing)}}
 function position(drawing:Element){const anchor=drawing.getElementsByTagNameNS('*','anchor')[0];if(!anchor)return{};const h=anchor.getElementsByTagNameNS('*','positionH')[0],v=anchor.getElementsByTagNameNS('*','positionV')[0];const x=h?.getElementsByTagNameNS('*','posOffset')[0],y=v?.getElementsByTagNameNS('*','posOffset')[0];if(!x||!y){warnings.add('An aligned floating image uses approximate placement.');return{}}return{position:{x:Number(x.textContent)/12700,y:Number(y.textContent)/12700,horizontal:h.getAttribute('relativeFrom')==='page'?'page' as const:'margin' as const,vertical:v.getAttribute('relativeFrom')==='page'?'page' as const:'margin' as const}}}
 function paragraph(p:Element,depth=0):WordPDFBlock[]{if(depth>8)throw new Error('This DOCX contains too many nested text objects.');const pPr=child(p,'pPr'),styleId=val(child(pPr,'pStyle'));const chain=styleChain(styleId);const runStyle=[defaultRun,...styleChain('Normal').map(s=>child(s,'rPr')),...chain.map(s=>child(s,'rPr'))].filter(Boolean) as Element[];const paraStyle=[defaultPara,...styleChain('Normal').map(s=>child(s,'pPr')),...chain.map(s=>child(s,'pPr')),pPr].filter(Boolean) as Element[];
  const property=(name:string)=>paraStyle.map(s=>child(s,name)).filter(Boolean).at(-1)||null;
  const attribute=(name:string,attr:string,fallback:string)=>paraStyle.map(s=>child(s,name)).map(el=>el?.getAttributeNS(w,attr)).filter(v=>v!==null&&v!==undefined).at(-1)??fallback;
  const units=(name:string,attr:string,fallback=0)=>{const value=Number(attribute(name,attr,String(fallback*20)))/20;return Number.isFinite(value)?value:fallback};
  const numPr=property('numPr'),align=val(property('jc')),rule=attribute('spacing','lineRule','auto');let indent=units('ind','left'),marker='';
  if(numPr){const numId=val(child(numPr,'numId')),level=num(child(numPr,'ilvl')),definition=numbering.get(numId),a=definition&&abstract.get(val(child(definition,'abstractNumId'))),lvl=a&&descendants(a,'lvl').find(l=>num(l,'ilvl')===level),format=val(child(lvl||null,'numFmt')),override=definition&&descendants(definition,'lvlOverride').find(o=>num(o,'ilvl')===level);const key=numId+':'+level,start=num(child(override||null,'startOverride'),'val',num(child(lvl||null,'start'),'val',1)),count=(counters.get(key)??start-1)+1;counters.set(key,count);indent=Math.max(indent,18+level*18);marker=(format==='bullet'?'•':format==='lowerLetter'?String.fromCharCode(97+(count-1)%26)+'.':format==='upperLetter'?String.fromCharCode(65+(count-1)%26)+'.':count+'.')+'  '}
  const base:Paragraph={type:'paragraph',runs:[],align:['center','right','justify','both'].includes(align)?(align==='both'?'justify':align) as Paragraph['align']:'left',before:units('spacing','before'),after:units('spacing','after',0),indent,line:rule==='exact'||rule==='atLeast'?units('spacing','line',12):Number(attribute('spacing','line','240'))/240,lineRule:rule==='exact'||rule==='atLeast'?rule:'auto',rightIndent:units('ind','right'),firstLine:units('ind','firstLine')-units('ind','hanging'),pageBreak:toggle(property('pageBreakBefore')),keepNext:toggle(property('keepNext')),keepLines:toggle(property('keepLines')),size:num(child(child(pPr,'rPr'),'sz'),'val',22)/2,tabs:descendants(property('tabs'),'tab').filter(t=>val(t)!=='clear').map(t=>({position:pt(t,'pos'),align:['center','right'].includes(val(t))?val(t) as 'center'|'right':'left'}))};
  const parts:WordPDFBlock[]=[];let runs:PDFRun[]=[],first=true;
  const flush=(empty=false)=>{if(runs.length||empty){parts.push({...base,runs,before:first?base.before:0,after:0,pageBreak:first&&base.pageBreak});runs=[];first=false}};
  for(const r of descendants(p,'r').filter(r=>{let owner=r.parentNode;while(owner&&!(owner.nodeType===1&&(owner as Element).namespaceURI===w&&(owner as Element).localName==='p'))owner=owner.parentNode;return owner===p})){const rPr=child(r,'rPr'),runChain=[...runStyle,...styleChain(val(child(rPr,'rStyle'))).map(s=>child(s,'rPr')),rPr].filter(Boolean) as Element[],rprop=(name:string)=>runChain.map(s=>child(s,name)).filter(Boolean).at(-1)||null;
   const size=Math.max(1,Math.min(96,num(rprop('sz'),'val',/Heading1/i.test(styleId)?32:/Heading/i.test(styleId)?26:22)/2));base.size=Math.max(base.size||0,size);const family=val(rprop('rFonts'),'ascii')||val(rprop('rFonts'),'hAnsi');const style={size,fontFamily:/Times|Roman|Serif|Georgia|Cambria/i.test(family)?'serif' as const:/Courier|Mono|Consolas/i.test(family)?'mono' as const:'sans' as const,fitWidth:rprop('fitText')?pt(rprop('fitText')):undefined,spacing:rprop('spacing')?pt(rprop('spacing')):undefined,bold:toggle(rprop('b')),italic:toggle(rprop('i')),underline:!!rprop('u')&&!['none','0'].includes(val(rprop('u'))),color:/^[0-9a-f]{6}$/i.test(val(rprop('color')))?val(rprop('color')):undefined};
   for(const node of Array.from(r.children)){
    if(node.localName==='t'){if(marker){runs.push({text:marker,size});marker=''}runs.push({text:node.textContent||'',...style})}
    else if(node.localName==='tab')runs.push({text:'\t',...style});
    else if(node.localName==='lastRenderedPageBreak'||node.localName==='br'&&val(node,'type')==='page'){flush();parts.push({type:'break',source:node.localName==='br'?'explicit':'saved'})}
    else if(node.localName==='br'||node.localName==='cr')runs.push({text:'\n',...style});
    else if(node.localName==='drawing'||node.localName==='pict'){const boxes=descendants(node,'txbxContent');if(boxes.length){for(const box of boxes){flush();const frame=frameObject(node,box,depth+1);if(frame)parts.push(frame)}}else if(node.localName==='drawing'){const picture=image(node);if(picture){if(!picture.position)flush();parts.push(picture)}}else for(const line of Array.from(node.getElementsByTagNameNS('urn:schemas-microsoft-com:vml','line'))){const rule=ruleObject(line);if(rule)parts.push(rule)}}
   }
  }
  flush(!parts.length);const last=parts.at(-1);if(last?.type==='paragraph')last.after=base.after;return parts;
 }
 function measure(value:string){const match=value.trim().match(/^(-?[\d.]+)(pt|px|in|cm|mm)?$/i);if(!match)return 0;return Number(match[1])*({pt:1,px:.75,in:72,cm:72/2.54,mm:72/25.4}[match[2]?.toLowerCase()||'pt']||1)}
 function frameObject(object:Element,box:Element,depth:number):Frame|null{
  let parent=box.parentNode as Element|null;while(parent&&parent.localName!=='shape'&&parent.localName!=='anchor'&&parent.localName!=='inline')parent=parent.parentNode as Element|null;
  if(!parent){warnings.add('An unsupported text object needs manual review.');return null}
  let x=0,y=0,width=0,height=0,horizontal:Frame['horizontal']='page',vertical:Frame['vertical']='page';
  if(parent.localName==='shape'){
   const style=Object.fromEntries((parent.getAttribute('style')||'').split(';').map(t=>t.split(':').map(v=>v.trim())).filter(v=>v.length===2));
   x=measure(style['margin-left']||style.left||'0');y=measure(style['margin-top']||style.top||'0');width=measure(style.width||'0');height=measure(style.height||'0');
   horizontal=style['mso-position-horizontal-relative']==='margin'?'margin':'page';vertical=style['mso-position-vertical-relative']==='margin'?'margin':'page';
   const textbox=parent.getElementsByTagNameNS('urn:schemas-microsoft-com:vml','textbox')[0],insets=(textbox?.getAttribute('inset')||'7.2pt,3.6pt,7.2pt,3.6pt').split(',').map(measure);x+=insets[0];y+=insets[1];width-=insets[0]+insets[2];height-=insets[1]+insets[3];
  }else{const extent=parent.getElementsByTagNameNS('*','extent')[0],pos=position(object).position;x=pos?.x||0;y=pos?.y||0;horizontal=pos?.horizontal||'page';vertical=pos?.vertical||'page';width=Number(extent?.getAttribute('cx')||0)/12700;height=Number(extent?.getAttribute('cy')||0)/12700;}
  if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0){warnings.add('A text object has unsupported geometry and needs manual review.');return null}
  return{type:'frame',x,y,width,height,horizontal,vertical,blocks:Array.from(box.children).flatMap(node=>node.localName==='p'?paragraph(node,depth):node.localName==='tbl'?[table(node,depth)]:[])};
 }
 function ruleObject(line:Element):Rule|null{const a=(line.getAttribute('from')||'').split(',').map(measure),b=(line.getAttribute('to')||'').split(',').map(measure);if(a.length!==2||b.length!==2)return null;return{type:'rule',x1:a[0],y1:a[1],x2:b[0],y2:b[1],width:Math.max(.1,measure(line.getAttribute('strokeweight')||'.5pt')),color:(line.getAttribute('strokecolor')||'#000000').replace('#','')}}
 function table(node:Element,depth=0):Table{
  const pr=child(node,'tblPr'),grid=child(node,'tblGrid'),widths=grid?Array.from(grid.children).map(c=>pt(c,'w',100)):[],rows:Table['rows']=[];
  const margins=(source:Element|null,fallback:CellMargins):CellMargins=>Object.fromEntries(['left','right','top','bottom'].map(edge=>[edge,pt(child(source,edge),'w',fallback[edge as keyof CellMargins])])) as CellMargins;
  const tableMargins=margins(child(pr,'tblCellMar'),{left:5.4,right:5.4,top:0,bottom:0});
  function borders(source:Element|null){const result:Partial<Record<'top'|'bottom'|'left'|'right',Border>>={};for(const edge of ['top','bottom','left','right'] as const){const element=child(source,edge);if(element&& !['nil','none'].includes(val(element)))result[edge]={width:num(element,'sz',4)/8,color:/^[a-f\d]{6}$/i.test(val(element,'color'))?val(element,'color'):'000000'};}return result;}
  const tableBorders=borders(child(pr,'tblBorders'));
  for(const row of Array.from(node.children).filter(c=>c.localName==='tr')){
   const cells:Table['rows'][number]['cells']=[];
   for(const cell of Array.from(row.children).filter(c=>c.localName==='tc')){
    const tcPr=child(cell,'tcPr');if(child(tcPr,'vMerge'))warnings.add('Vertically merged table cells may differ.');if(child(cell,'tbl'))warnings.add('Nested tables need manual review.');
    const parts=Array.from(cell.children).filter(c=>c.localName==='p').flatMap(p=>paragraph(p,depth));
    const paragraphs=parts.filter((p):p is Paragraph=>p.type==='paragraph'),images=parts.filter((p):p is Picture=>p.type==='image');
    if(parts.some(p=>p.type==='break'||p.type==='frame'))warnings.add('Page breaks or floating objects inside table cells need review.');
    cells.push({paragraphs,images,span:Math.max(1,num(child(tcPr,'gridSpan'),'val',1)),margins:margins(child(tcPr,'tcMar'),tableMargins),borders:child(tcPr,'tcBorders')?borders(child(tcPr,'tcBorders')):tableBorders});
   }
   const trPr=child(row,'trPr'),rowHeight=child(trPr,'trHeight');rows.push({cells,header:toggle(child(trPr,'tblHeader')),minHeight:pt(rowHeight),exactHeight:val(rowHeight,'hRule')==='exact',cantSplit:toggle(child(trPr,'cantSplit'))});
  }
  return{type:'table',widths,rows,indent:pt(child(pr,'tblInd'),'w')};
 }
 // A paragraph's sectPr closes its section. Its own page geometry applies
 // backwards to that section, never globally to the whole document.
 const groups:{nodes:Element[];sect:Element|null}[]=[];let pending:Element[]=[];
 for(const node of Array.from(body.children)){if(node.localName==='sectPr'){groups.push({nodes:pending,sect:node});pending=[]}else{pending.push(node);const sect=node.localName==='p'?child(child(node,'pPr'),'sectPr'):null;if(sect){groups.push({nodes:pending,sect});pending=[]}}}
 if(pending.length||!groups.length)groups.push({nodes:pending,sect:null});
 let inheritedHeaders:Paragraph[]|undefined,inheritedFooters:Paragraph[]|undefined;
 function layout(sect:Element|null):PageLayout{const size=child(sect,'pgSz'),margin=child(sect,'pgMar'),page:PageLayout={width:pt(size,'w',595.28),height:pt(size,'h',841.89),left:pt(margin,'left',54),right:pt(margin,'right',54),top:pt(margin,'top',54),bottom:pt(margin,'bottom',54),headerDistance:pt(margin,'header',24),footerDistance:pt(margin,'footer',24)};
  if(page.width<144||page.height<144||page.width>1440||page.height>1440)throw new Error('This DOCX uses an unsupported page size.');if(page.left+page.right>page.width-72||page.top+page.bottom>page.height-72)throw new Error('This DOCX has margins too large for its page size.');
  for(const name of ['header','footer'] as const){for(const ref of Array.from(sect?.children||[]).filter(el=>el.localName===name+'Reference')){const target=relationships.get(ref.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||''),part=target&&xml(entries[target.startsWith('/')?target.slice(1):'word/'+target]);if(!part)continue;const paragraphs=descendants(part,'p').flatMap(p=>paragraph(p)).filter((block):block is Paragraph=>block.type==='paragraph');if(descendants(part,'drawing').length||descendants(part,'tbl').length)warnings.add('Complex header/footer drawings and tables need review.');if(val(ref,'type')==='first'&&toggle(child(sect,'titlePg'))){if(name==='header')page.firstHeaders=paragraphs;else page.firstFooters=paragraphs}else if(val(ref,'type')==='default'){if(name==='header')inheritedHeaders=paragraphs;else inheritedFooters=paragraphs}}}
  page.headers=inheritedHeaders;page.footers=inheritedFooters;const cols=child(sect,'cols');if(num(cols,'num',1)>1)warnings.add('DOCX text columns use conservative single-column flow; saved page boundaries are retained.');return page;
 }
 const blocks:WordPDFBlock[]=[];let chars=0,index=0;const push=(part:WordPDFBlock)=>{const count=(part:WordPDFBlock):number=>part.type==='paragraph'?part.runs.reduce((n,r)=>n+r.text.length,0):part.type==='frame'?part.blocks.reduce((n,b)=>n+count(b),0):part.type==='table'?part.rows.reduce((n,row)=>n+row.cells.reduce((v,c)=>v+c.paragraphs.reduce((sum,p)=>sum+count(p),0),0),0):0;chars+=count(part);if(part.type==='break'&&part.source==='saved'){const previous=blocks.at(-1);if(previous?.type==='break'||previous?.type==='section')return}blocks.push(part)};
 const layouts=groups.map(g=>layout(g.sect));
 for(const [groupIndex,group] of groups.entries()){const type=val(child(group.sect,'type')),start=groupIndex===0?'initial':['continuous','oddPage','evenPage'].includes(type)?type as 'continuous'|'oddPage'|'evenPage':'nextPage';push({type:'section',layout:layouts[groupIndex],start});
  for(const node of group.nodes){if(signal.aborted)throw new DOMException('Cancelled','AbortError');if(++index%30===0){progress('Preparing document structure…');await new Promise<void>(resolve=>setTimeout(resolve,0))}
   if(node.localName==='p'){for(const part of paragraph(node))push(part)}
   else if(node.localName==='tbl'){push(table(node));
   }else warnings.add('Some unsupported document elements may be omitted.');
  }
 }
 if(chars>200000)throw new Error('This DOCX has too much text. Use at most 200,000 characters.');if(!chars&&!blocks.some(b=>b.type==='image'||b.type==='table'&&b.rows.some(r=>r.cells.some(c=>c.images?.length))))throw new Error('This DOCX has no supported text or images.');if(descendants(document,'fldChar').length)warnings.add('Fields use their saved text; dynamic page numbers and contents are not recalculated.');
 return{blocks,...layouts[0],warnings:[...warnings],source:'docx'};
}

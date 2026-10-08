/** Native PDF coordinates in physical page points. This module never uses OCR. */
export type Bounds={x:number;y:number;width:number;height:number};
export type NativeText={text:string;x:number;baseline:number;width:number;size:number;font:string;bold:boolean;italic:boolean;color:string;rtl:boolean};
export type NativeLine={items:NativeText[];x:number;right:number;baseline:number;size:number};
export type NativeRule={x1:number;y1:number;x2:number;y2:number;width:number;color:string};
export type NativeDrawing=Bounds&{complex:boolean;rules:NativeRule[]};
export type NativeGraphic=Bounds&{kind:'image'|'diagram';bytes?:Uint8Array};
export type NativeParagraph=Bounds&{type:'paragraph';lines:NativeLine[];leading:number;heading:boolean};
export type NativeCell={lines:NativeLine[]};
export type NativeTable=Bounds&{type:'table';columns:number[];rows:{top:number;height:number;cells:NativeCell[]}[];grid:boolean;header:boolean;rules:NativeRule[]};
export type NativePage={width:number;height:number;text:NativeText[];drawings:NativeDrawing[];graphics:NativeGraphic[]};
export type EditablePage={width:number;height:number;paragraphs:NativeParagraph[];tables:NativeTable[];graphics:NativeGraphic[];rules:NativeRule[]};
export const median=(values:number[])=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0};
const contains=(b:Bounds,x:number,y:number,pad=0)=>x>=b.x-pad&&x<=b.x+b.width+pad&&y>=b.y-pad&&y<=b.y+b.height+pad;
const union=(a:Bounds,b:Bounds):Bounds=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(a.x+a.width,b.x+b.width)-Math.min(a.x,b.x),height:Math.max(a.y+a.height,b.y+b.height)-Math.min(a.y,b.y)});
const near=(a:Bounds,b:Bounds,pad:number)=>a.x<=b.x+b.width+pad&&b.x<=a.x+a.width+pad&&a.y<=b.y+b.height+pad&&b.y<=a.y+a.height+pad;
const unique=(values:number[],tolerance=1)=>values.sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>tolerance);

export function nativeLines(text:NativeText[]):NativeLine[]{
 const lines:NativeLine[]=[];
 for(const item of [...text].sort((a,b)=>a.baseline-b.baseline||a.x-b.x)){
  let line=lines.at(-1);
  if(!line||Math.abs(line.baseline-item.baseline)>Math.max(1.1,item.size*.14)){
   line={items:[],x:item.x,right:item.x+item.width,baseline:item.baseline,size:item.size};lines.push(line);
  }
  line.items.push(item);line.x=Math.min(line.x,item.x);line.right=Math.max(line.right,item.x+item.width);line.size=Math.max(line.size,item.size);
 }
 for(const line of lines)line.items.sort((a,b)=>a.x-b.x);
 return lines;
}

/** Only complex drawing clusters are rasterized; page text is never a backdrop. */
export function diagramRegions(page:NativePage):NativeGraphic[]{
 const groups:{bounds:Bounds;drawings:NativeDrawing[]}[]=[];
 for(const drawing of page.drawings){
  if(drawing.width<.1&&drawing.height<.1)continue;
  const matches=groups.filter(g=>near(g.bounds,drawing,38));
  if(!matches.length){groups.push({bounds:{...drawing},drawings:[drawing]});continue;}
  const first=matches[0];first.bounds=union(first.bounds,drawing);first.drawings.push(drawing);
  for(const other of matches.slice(1)){first.bounds=union(first.bounds,other.bounds);first.drawings.push(...other.drawings);groups.splice(groups.indexOf(other),1);}
 }
 const regions:NativeGraphic[]=[];
 for(const group of groups){
  if(!group.drawings.some(d=>d.complex)||group.bounds.height<12||group.bounds.width<12)continue;
  let b=group.bounds;
  // Figure labels beside a chart belong to that localized figure, not to the
  // surrounding document. Captions below it remain native editable text.
  for(const item of page.text)if(item.baseline>=b.y-2&&item.baseline<=b.y+b.height+2&&item.x+item.width>=b.x-150&&item.x<=b.x+b.width+150){b=union(b,{x:item.x,y:item.baseline-item.size,width:item.width,height:item.size*1.25});}
  b={x:Math.max(0,b.x-2),y:Math.max(0,b.y-2),width:Math.min(page.width-b.x+2,b.width+4),height:Math.min(page.height-b.y+2,b.height+4)};
  if(b.width*b.height>page.width*page.height*.75)throw new Error('This PDF uses overlapping full-page artwork that cannot be preserved as editable Word text. Try a simpler PDF.');
  regions.push({...b,kind:'diagram'});
 }
 return regions;
}

function horizontalRules(page:NativePage,graphics:NativeGraphic[]):NativeRule[]{
 const rules=page.drawings.flatMap(d=>d.rules).filter(r=>Math.abs(r.y2-r.y1)<.6&&!graphics.some(b=>contains(b,(r.x1+r.x2)/2,r.y1,2)));
 const out:NativeRule[]=[];
 for(const r of rules.sort((a,b)=>a.y1-b.y1||a.x1-b.x1)){
  const previous=out.find(p=>Math.abs(p.y1-r.y1)<.7&&Math.min(p.x1,p.x2)<=Math.max(r.x1,r.x2)+1&&Math.min(r.x1,r.x2)<=Math.max(p.x1,p.x2)+1);
  if(previous){previous.x1=Math.min(previous.x1,previous.x2,r.x1,r.x2);previous.x2=Math.max(previous.x1,previous.x2,r.x1,r.x2);}
  else out.push({...r,x1:Math.min(r.x1,r.x2),x2:Math.max(r.x1,r.x2)});
 }return out;
}

function recoverTables(page:NativePage,text:NativeText[],graphics:NativeGraphic[]):NativeTable[]{
 const horizontal=horizontalRules(page,graphics).filter(r=>r.x2-r.x1>80&&r.y1<page.height*.92);
 const groups:NativeRule[][]=[];
 for(const rule of horizontal){let g=groups.find(rs=>Math.abs(rs[0].x1-rule.x1)<2&&Math.abs(rs[0].x2-rule.x2)<2);if(!g){g=[];groups.push(g);}g.push(rule);}
 const tables:NativeTable[]=[];
 for(const group of groups){
  group.sort((a,b)=>a.y1-b.y1);
  // Grid borders or a top/header/bottom booktabs triplet. A pair of signature
  // rules without repeated aligned columns is not promoted into a table.
  for(let start=0;start<group.length-2;){
   const left=group[start].x1,right=group[start].x2,top=group[start].y1;
   let end=start+2;
   const vertical=page.drawings.flatMap(d=>d.rules).filter(r=>Math.abs(r.x1-r.x2)<.6&&r.x1>=left-1&&r.x1<=right+1&&Math.max(r.y1,r.y2)>top+1&&Math.min(r.y1,r.y2)<group[start+2].y1);
   const grid=unique(vertical.map(r=>r.x1)).length>=3;
   if(grid){while(end+1<group.length&&group[end+1].y1-group[end].y1<65)end++;}
   let bottom=group[end].y1;const area={x:left,y:top,width:right-left,height:bottom-top};
   if(area.height<20||area.height>page.height*.82){start++;continue;}
   let inside=text.filter(i=>contains(area,i.x+i.width*.5,i.baseline-i.size*.25));
   let lines=nativeLines(inside);if(lines.length<2){start++;continue;}
   const headerLines=lines.filter(l=>l.baseline<group[start+1].y1+1);
   const header=headerLines[0];if(!header){start++;continue;}
   let boundaries:number[];
   if(grid)boundaries=unique([left,right,...vertical.map(r=>r.x1)]);
   else{
    const cells:NativeText[][]=[];
    for(const item of header.items.filter(i=>i.text.trim())){const previous=cells.at(-1)?.at(-1);if(!previous||item.x-previous.x-previous.width>Math.max(8,item.size*.75))cells.push([item]);else cells.at(-1)!.push(item);}
    if(cells.length<2||cells.length>8){start++;continue;}
    const pad=Math.max(0,Math.min(8,cells[0][0].x-left));
    boundaries=[left,...cells.slice(1).map(c=>c[0].x-pad),right];
   }
   if(boundaries.some((b,i)=>i>0&&b-boundaries[i-1]<8)){start++;continue;}
   if(!grid){
    // A booktabs total can sit between an additional pair of rules. Keep that
    // short, bold, multi-column band in this table instead of ordinary prose.
    while(end+1<group.length&&group[end+1].y1-bottom<header.size*2.6){
     const nextBottom=group[end+1].y1;
     const band=text.filter(i=>i.text.trim()&&i.x+i.width*.5>=left&&i.x+i.width*.5<=right&&i.baseline-i.size*.25>bottom&&i.baseline-i.size*.25<nextBottom);
     const occupied=new Set(band.map(i=>boundaries.slice(1).findIndex(x=>i.x+i.width*.5<x)));
     if(occupied.size<2||!band.every(i=>i.bold))break;
     bottom=nextBottom;area.height=bottom-top;end++;
    }
    inside=text.filter(i=>contains(area,i.x+i.width*.5,i.baseline-i.size*.25));lines=nativeLines(inside);
   }
   let rowBounds:number[];
   if(grid)rowBounds=unique(group.slice(start,end+1).map(r=>r.y1));
   else{
    const headerBottom=group[start+1].y1;
    const body=lines.filter(l=>l.baseline>headerBottom+1);
    // Estimate wrapped leading within each column. A global previous line can
    // belong to another cell; its cadence must not merge unrelated table rows.
    const columns=boundaries.slice(0,-1).map((x,column)=>nativeLines(inside.filter(i=>i.text.trim()&&i.x+i.width*.5>=x-.2&&i.x+i.width*.5<boundaries[column+1]-.2&&i.baseline>headerBottom+1)));
    const size=median(body.map(l=>l.size))||header.size;
    const gaps=columns.flatMap(column=>column.slice(1).map((l,i)=>l.baseline-column[i].baseline)).filter(g=>g>size*.75&&g<size*2.5).sort((a,b)=>a-b);
    const leading=Math.min(gaps[Math.floor(gaps.length*.2)]||size*1.2,size*1.22);
    const starts:NativeLine[]=[];let previous:NativeLine|undefined;
    for(const line of columns[0]){
     const firstText=line.items.map(i=>i.text).join('').trim();
     const numeric=/^\d+(?:\s*[-–]\s*\d+)?[.)]?$/.test(firstText);
     // Booktabs often adds only a fraction of a font size between rows.
     // Wrapped labels, including bold labels, stay inside their original cell.
     if(!previous||numeric||line.baseline-previous.baseline>leading+Math.max(1,line.size*.16))starts.push(line);
     previous=line;
    }
    if(!starts.length){start++;continue;}
    rowBounds=unique([top,headerBottom,...starts.slice(1).map(l=>{
     const y=l.baseline-l.size*1.08,rule=group.slice(start+1,end).find(r=>Math.abs(r.y1-y)<l.size*.4);
     return rule?.y1??y;
    }),bottom]);
   }
   const rows=rowBounds.slice(0,-1).map((y,index)=>({top:y,height:rowBounds[index+1]-y,cells:boundaries.slice(0,-1).map((x,column)=>({lines:nativeLines(inside.filter(i=>i.x+i.width*.5>=x-.2&&i.x+i.width*.5<boundaries[column+1]-.2&&i.baseline-i.size*.25>=y-.2&&i.baseline-i.size*.25<rowBounds[index+1]-.2))}))}));
   if(rows.length<2||rows.some(row=>row.height<3)){start++;continue;}
   tables.push({...area,type:'table',columns:boundaries,rows,grid,header:header.items.every(i=>i.bold),rules:group.slice(start,end+1)});
   start=end+1;
  }
 }return tables;
}

export function editableLayout(page:NativePage):EditablePage{
 const graphics=[...page.graphics,...diagramRegions(page)];
 const text=page.text.filter(i=>!graphics.some(g=>contains(g,i.x+i.width*.5,i.baseline-i.size*.25)));
 const tables=recoverTables(page,text,graphics);
 const remaining=text.filter(i=>!tables.some(t=>contains(t,i.x+i.width*.5,i.baseline-i.size*.25)));
 const lines=nativeLines(remaining),paragraphs:NativeParagraph[]=[];
 for(const [index,line]of lines.entries()){
  const previous=paragraphs.at(-1),last=previous?.lines.at(-1),plain=line.items.map(i=>i.text).join('');
  const heading=line.items.every(i=>i.bold)&&plain.length<180;
  const gap=last?line.baseline-last.baseline:Infinity;
  // A wrapped first line can be indented or include a hanging list marker.
  // Wider-spaced prose is still one paragraph when full lines share a cadence.
  // Do not relax the limits for short independent labels or a new list item.
  const fullLine=last&&last.right>=page.width-Math.min(last.x,line.x)-line.size*2;
  const next=lines[index+1],newList=/^\s*(?:[•●◦▪‣]|\d+[.)])(?:\s|$)/.test(plain);
  const cadence=previous&&(!previous.lines[1]||Math.abs(gap-previous.leading)<2.5);
  const indent=last&&(Math.abs(last.x-line.x)<Math.max(10,line.size*.8)||
   (!newList&&previous?.lines.length===1&&fullLine&&Math.abs(last.x-line.x)<=line.size*3));
  const spacing=gap<line.size*2.18||(!newList&&fullLine&&gap<line.size*3&&
   (previous&&previous.lines.length>1||next&&Math.abs(next.baseline-line.baseline-gap)<2.5));
  const same=previous&&last&&!heading&&!previous.heading&&Math.abs(last.size-line.size)<.6&&indent&&gap>line.size*.8&&spacing&&cadence;
  if(same){const right=Math.max(previous.x+previous.width,line.right);previous.x=Math.min(previous.x,line.x);previous.lines.push(line);previous.leading=gap;previous.width=right-previous.x;previous.height=line.baseline-previous.lines[0].baseline+line.size*1.35;}
  else paragraphs.push({type:'paragraph',x:line.x,y:line.baseline-line.size,width:line.right-line.x,height:line.size*1.4,lines:[line],leading:line.size*1.15,heading});
 }
 const rules=page.drawings.flatMap(d=>d.rules).filter(r=>!graphics.some(g=>contains(g,(r.x1+r.x2)/2,(r.y1+r.y2)/2,2))&&!tables.some(t=>
  t.rules.some(border=>Math.abs(r.y1-r.y2)<.6&&Math.abs(border.y1-r.y1)<.7&&Math.min(r.x1,r.x2)>=border.x1-1&&Math.max(r.x1,r.x2)<=border.x2+1)||
  (t.grid&&Math.abs(r.x1-r.x2)<.6&&t.columns.some(x=>Math.abs(x-r.x1)<.7)&&contains(t,r.x1,(r.y1+r.y2)/2,1))));
 return{width:page.width,height:page.height,paragraphs,tables,graphics,rules};
}

export function parsePageSelection(value:string,total:number){
 const indices:number[]=[];const seen=new Set<number>();
 if(!value.trim())throw new Error('Enter page numbers, such as 1, 3-5.');
 for(const part of value.split(',')){
  const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!match)throw new Error('Use comma-separated pages or ranges, such as 1, 3-5.');
  const start=Number(match[1]),end=Number(match[2]||match[1]);if(start<1||end<start||end>total)throw new Error(`Pages must be between 1 and ${total}, with ranges in ascending order.`);
  if(end-start>500)throw new Error('Select at most 500 pages.');
  for(let page=start;page<=end;page++){if(seen.has(page))throw new Error(`Page ${page} is selected more than once.`);seen.add(page);indices.push(page-1)}
 }
 if(indices.length>500)throw new Error('Select at most 500 pages.');return indices;
}

import type {CropRect} from './image-processing';
export type CropHandle='move'|'nw'|'ne'|'sw'|'se';
export function adjustCrop(w:number,h:number,c:CropRect,dx:number,dy:number,handle:CropHandle):CropRect{
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(n)));
 if(handle==='move')return {...c,x:clamp(c.x+dx,0,w-c.width),y:clamp(c.y+dy,0,h-c.height)};
 const x1=handle.endsWith('w')?clamp(c.x+dx,0,c.x+c.width-1):c.x;
 const y1=handle.startsWith('n')?clamp(c.y+dy,0,c.y+c.height-1):c.y;
 const x2=handle.endsWith('e')?clamp(c.x+c.width+dx,x1+1,w):c.x+c.width;
 const y2=handle.startsWith('s')?clamp(c.y+c.height+dy,y1+1,h):c.y+c.height;
 return {x:x1,y:y1,width:x2-x1,height:y2-y1};
}

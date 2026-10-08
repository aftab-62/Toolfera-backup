'use client';
import {useRef,useState,type PointerEvent,type DragEvent} from 'react';
export function useFileOrder(disabled:boolean,move:(from:number,to:number)=>void){
 const drag=useRef<number|null>(null),pointer=useRef<{from:number;target:number;y:number;moved:boolean}|null>(null);
 const[sorting,setSorting]=useState<number|null>(null);
 function start(e:PointerEvent<HTMLSpanElement>,i:number){if(disabled)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointer.current={from:i,target:i,y:e.clientY,moved:false};setSorting(i)}
 function track(e:PointerEvent<HTMLSpanElement>){const p=pointer.current;if(!p)return;p.moved||=Math.abs(e.clientY-p.y)>8;let nearest=Infinity;Array.from(e.currentTarget.closest('ol')!.querySelectorAll('li')).forEach((row,i)=>{const r=row.getBoundingClientRect(),d=Math.abs(e.clientY-r.top-r.height/2);if(d<nearest){nearest=d;p.target=i}})}
 function end(){const p=pointer.current;pointer.current=null;setSorting(null);if(p?.moved)move(p.from,p.target)}
 return {sorting,handle:(i:number)=>({onPointerDown:(e:PointerEvent<HTMLSpanElement>)=>start(e,i),onPointerMove:track,onPointerUp:end,onPointerCancel:()=>{pointer.current=null;setSorting(null)}}),row:(i:number)=>({draggable:!disabled,onDragStart:(e:DragEvent<HTMLLIElement>)=>{drag.current=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i))},onDragEnd:()=>{drag.current=null},onDragOver:(e:DragEvent<HTMLLIElement>)=>{if(!disabled)e.preventDefault()},onDrop:(e:DragEvent<HTMLLIElement>)=>{e.preventDefault();if(!disabled&&drag.current!==null)move(drag.current,i);drag.current=null}})};
}

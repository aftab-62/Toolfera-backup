/** Budget before allocating; ceil rounding must fit both pixel ceilings. */
export function safeRenderScale(width:number,height:number,requested:number,budget:number){
 let scale=Math.min(requested,Math.sqrt(budget/(width*height)));
 for(let i=0;i<8&&Math.ceil(width*scale)*Math.ceil(height*scale)>budget;i++)scale*=Math.sqrt(budget/(Math.ceil(width*scale)*Math.ceil(height*scale)))*.999999;
 if(Math.ceil(width*scale)*Math.ceil(height*scale)>budget)throw new Error('Unable to render this page within the safe pixel budget.');return scale;
}

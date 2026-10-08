// Coordinates remain in the layout viewport, including iOS keyboard/pinch offsets.
export function searchPlacement(rect:{left:number;top:number;bottom:number;width:number},viewport:{top:number;left:number;height:number;width:number}){
 const edge=10,gap=8,top=viewport.top+edge,bottom=viewport.top+viewport.height-edge;
 const below=Math.max(0,bottom-rect.bottom-gap),above=Math.max(0,rect.top-gap-top),cap=Math.min(420,viewport.height*.58);
 const flip=below<Math.min(150,cap)&&above>below;
 const height=Math.min(cap,flip?above:below);
 // A keyboard can move the input outside the visible area. Keep results available
 // in the visible viewport rather than closing the focused combobox.
 const maxHeight=height<80?Math.min(cap,Math.max(0,viewport.height-2*edge)):height;
 const preferred=height<80?top:flip?rect.top-gap-maxHeight:rect.bottom+gap;
 const width=Math.min(rect.width,Math.max(0,viewport.width-2*edge));
 return{left:Math.max(viewport.left+edge,Math.min(rect.left,viewport.left+viewport.width-edge-width)),width,top:Math.max(top,Math.min(preferred,bottom-maxHeight)),maxHeight};
}

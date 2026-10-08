export type ImagePageOptions={pageSize?:string;orientation?:string;fit?:string;margin?:number;dimensions?:{width:number;height:number}};
export function imagePageLayout(width:number,height:number,options:ImagePageOptions={}){
 const{pageSize='original',orientation='auto',fit='fit',margin=18,dimensions}=options;
 if(!['original','a4','letter'].includes(pageSize)||!['auto','portrait','landscape'].includes(orientation)||!['fit','fill'].includes(fit))throw new Error('Choose supported page settings.');
 if(![width,height].every(v=>Number.isFinite(v)&&v>0)||![0,18,36].includes(margin))throw new Error('Choose valid image dimensions and margins.');
 let w:number,h:number;const pad=dimensions?0:margin;
 if(dimensions){w=dimensions.width;h=dimensions.height}
 else if(pageSize==='original'){w=width*.75+2*pad;h=height*.75+2*pad}
 else [w,h]=pageSize==='letter'?[612,792]:[595.28,841.89];
 if(!dimensions){const landscape=orientation==='landscape'||(orientation==='auto'&&width>height);if(landscape&&w<h||!landscape&&w>h)[w,h]=[h,w]}
 const contentWidth=w-2*pad,contentHeight=h-2*pad;
 if(![w,h,contentWidth,contentHeight].every(v=>Number.isFinite(v)&&v>0))throw new Error('Choose a smaller margin for this image.');
 const scale=(fit==='fill'&&!dimensions?Math.max:Math.min)(contentWidth/width,contentHeight/height);
 const drawWidth=width*scale,drawHeight=height*scale;
 return {width:w,height:h,pad,contentWidth,contentHeight,drawWidth,drawHeight,x:(w-drawWidth)/2,y:(h-drawHeight)/2,clip:fit==='fill'&&!dimensions};
}

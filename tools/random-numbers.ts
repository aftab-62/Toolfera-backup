export function randomNumbers(min:number,max:number,count:number,unique:boolean){
 if(!Number.isInteger(min)||!Number.isInteger(max)||min< -1_000_000_000||max>1_000_000_000||min>max)throw new Error('Use whole-number bounds from −1 billion to 1 billion, with minimum no greater than maximum.');
 if(!Number.isInteger(count)||count<1||count>1000)throw new Error('Generate between 1 and 1,000 numbers.');
 const range=max-min+1;if(unique&&count>range)throw new Error('There are not enough different numbers in this range. Reduce the count or allow repeats.');
 if(!globalThis.crypto?.getRandomValues)throw new Error('Secure random generation is unavailable. Use a recent browser.');
 const buffer=new Uint32Array(1);
 const pick=(size:number)=>{const limit=Math.floor(0x100000000/size)*size;let n:number;do{crypto.getRandomValues(buffer);n=buffer[0]}while(n>=limit);return n%size};
 if(!unique)return Array.from({length:count},()=>min+pick(range));
 // Floyd sampling terminates in O(count), even when selecting the entire range.
 const chosen=new Set<number>();for(let j=range-count;j<range;j++){const candidate=pick(j+1);chosen.add(chosen.has(candidate)?j:candidate)}
 const result=Array.from(chosen,value=>value+min);for(let i=result.length-1;i>0;i--){const j=pick(i+1);[result[i],result[j]]=[result[j],result[i]]}return result;
}

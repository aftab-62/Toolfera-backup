export function percentage(a:number,b:number,mode:'of'|'ratio'){if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error('Enter valid numbers.');if(mode==='ratio'&&b===0)throw new Error('The total cannot be zero.');return mode==='of'?a/100*b:a/b*100}
export function weightedAverage(rows:{credits:number;points:number}[]){if(!rows.length||rows.some(r=>!Number.isFinite(r.credits)||!Number.isFinite(r.points)||r.credits<=0||r.credits>1000||r.points<0||r.points>10))throw new Error('Use credits above 0 (up to 1,000) and grade points between 0 and 10.');const credits=rows.reduce((s,r)=>s+r.credits,0);return {value:rows.reduce((s,r)=>s+r.credits*r.points,0)/credits,credits}}
export function fuelCost(distance:number,efficiency:number,price:number){if(![distance,efficiency,price].every(Number.isFinite)||distance<0||efficiency<=0||price<0)throw new Error('Use a non-negative distance and price, and fuel efficiency above zero.');const litres=distance/efficiency;const cost=litres*price;if(!Number.isFinite(cost))throw new Error('These numbers are too large to calculate.');return{litres,cost}}
export function textStats(text:string){const words=text.trim()?text.trim().split(/\s+/u).length:0;return{words,characters:Array.from(text).length,noSpaces:Array.from(text.replace(/\s/gu,'')).length,minutes:words?Math.ceil(words/200):0}}

export function journeyFuelCost(distance:number,efficiency:number,price:number,distanceUnit:'km'|'mi',efficiencyUnit:'km/L'|'L/100km'|'mpg'|'mpg-imp',priceUnit:'L'|'gal'|'gal-imp',people=1){
 if(!Number.isFinite(efficiency)||efficiency<=0)throw new Error('Fuel efficiency must be above zero.');
 if(!Number.isInteger(people)||people<1||people>10000)throw new Error('Use a whole number of people between 1 and 10,000.');
 const km=distance*(distanceUnit==='mi'?1.609344:1);
 const kmPerL=efficiencyUnit==='L/100km'?100/efficiency:efficiencyUnit==='mpg'?efficiency*1.609344/3.785411784:efficiencyUnit==='mpg-imp'?efficiency*1.609344/4.54609:efficiency;
 const result=fuelCost(km,kmPerL,price/(priceUnit==='gal'?3.785411784:priceUnit==='gal-imp'?4.54609:1));
 return {...result,costPerPerson:result.cost/people};
}

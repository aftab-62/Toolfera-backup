function finite(values:number[]){if(values.some(value=>!Number.isFinite(value)))throw new Error('Enter a valid number in every field.');}
function amount(value:number){if(value<0||value>1e12)throw new Error('Amounts must be between 0 and 1 trillion.');}
export function marksResult(earned:number,possible:number,remaining:number,target:number){
 finite([earned,possible,remaining,target]);if(possible<=0||earned<0||earned>possible||remaining<0||possible+remaining>1e9)throw new Error('Use valid marks: obtained cannot exceed the completed total, and totals must be above zero.');
 if(target<0||target>100)throw new Error('The target must be between 0 and 100%.');
 const needed=Math.max(0,(possible+remaining)*target/100-earned);
 return {percentage:earned/possible*100,needed,remaining,reachable:needed<=remaining,total:possible+remaining};
}
export function attendanceResult(attended:number,held:number,target:number){
 finite([attended,held,target]);if(!Number.isInteger(attended)||!Number.isInteger(held)||held<1||held>1e6||attended<0||attended>held)throw new Error('Use whole class counts. Attended cannot exceed classes held.');
 if(target<=0||target>100)throw new Error('Choose a target above 0 and up to 100%.');
 const percentage=attended/held*100;
 const needed=percentage>=target?0:target===100?null:Math.max(0,Math.ceil((target*held-100*attended)/(100-target)-1e-10));
 const canMiss=Math.max(0,Math.floor((100*attended-target*held)/target+1e-10));
 return {percentage,needed,canMiss};
}
export function meritResult(rows:{earned:number;possible:number;weight:number}[]){
 if(!rows.length||rows.length>10)throw new Error('Use between 1 and 10 components.');
 for(const row of rows){finite([row.earned,row.possible,row.weight]);if(row.possible<=0||row.earned<0||row.earned>row.possible||row.weight<0||row.weight>100)throw new Error('Check marks, total marks and weights for every component.');}
 const weight=rows.reduce((sum,row)=>sum+row.weight,0);if(Math.abs(weight-100)>1e-6)throw new Error(`Weights must add up to 100%. Current total: ${Number(weight.toFixed(4))}%.`);
 return rows.reduce((sum,row)=>sum+row.earned/row.possible*row.weight,0);
}
export function loanResult(principal:number,annualRate:number,months:number){
 finite([principal,annualRate,months]);amount(principal);if(annualRate<0||annualRate>100||!Number.isInteger(months)||months<1||months>1200)throw new Error('Use a rate from 0 to 100% and 1–1,200 whole months.');
 const r=annualRate/1200,payment=r===0?principal/months:principal*r/(-Math.expm1(-months*Math.log1p(r)));
 return {payment,total:payment*months,interest:Math.max(0,payment*months-principal)};
}
export function savingsResult(initial:number,monthly:number,annualRate:number,years:number){
 finite([initial,monthly,annualRate,years]);amount(initial);amount(monthly);if(annualRate<0||annualRate>100||!Number.isInteger(years)||years<1||years>100)throw new Error('Use a return from 0 to 100% and 1–100 whole years.');
 const n=years*12,r=annualRate/1200,growth=Math.expm1(n*Math.log1p(r)),contributions=initial+monthly*n;
 const balance=initial*(growth+1)+(r===0?monthly*n:monthly*growth/r);
 if(!Number.isFinite(balance)||balance>Number.MAX_SAFE_INTEGER)throw new Error('This projection is too large. Use smaller amounts, a lower return or fewer years.');
 return {balance,contributions,interest:Math.max(0,balance-contributions)};
}
export function profitResult(revenue:number,cost:number){finite([revenue,cost]);amount(revenue);amount(cost);const profit=revenue-cost;return {profit,margin:revenue===0?null:profit/revenue*100,markup:cost===0?null:profit/cost*100};}
export function salaryResult(pay:number,period:string,hours:number,weeks:number){
 finite([pay,hours,weeks]);amount(pay);if(hours<=0||hours>168||weeks<=0||weeks>52)throw new Error('Use 0–168 working hours per week and 0–52 paid weeks, both above zero.');
 const annual=period==='hour'?pay*hours*weeks:period==='day'?pay*5*weeks:period==='week'?pay*weeks:period==='month'?pay*12:period==='year'?pay:NaN;
 if(!Number.isFinite(annual))throw new Error('Choose a supported pay period.');
 return {annual,monthly:annual/12,weekly:annual/weeks,hourly:annual/(hours*weeks)};
}

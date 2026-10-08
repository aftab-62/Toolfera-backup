import {FileInputError} from './file-input.ts';
import type {Paragraph,WordPDFModel,Table} from './word-pdf-model';
export type InvoiceItem={description:string;quantity:number;price:number};
export type InvoiceInput={from:string;to:string;number:string;date:string;due:string;currency:string;items:InvoiceItem[];tax:number;discount:number;note:string};
const cents=(value:number)=>Math.round((value+Number.EPSILON)*100);
export function invoiceTotals(items:InvoiceItem[],tax:number,discount:number){
 if(!items.length||items.length>30)throw new FileInputError('Use between 1 and 30 invoice items.');
 const lines=items.map(item=>{if(!item.description.trim()||item.description.length>200||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>1e6||!Number.isFinite(item.price)||item.price<0||item.price>1e9)throw new FileInputError('Every item needs a description, a quantity above zero and a non-negative price.');return cents(item.quantity*item.price)});
 const subtotal=lines.reduce((sum,line)=>sum+line,0);if(subtotal>1e14)throw new FileInputError('This invoice total is too large. Use smaller amounts.');
 if(!Number.isFinite(tax)||tax<0||tax>100||!Number.isFinite(discount)||discount<0||cents(discount)>subtotal)throw new FileInputError('Use tax from 0 to 100% and a discount no greater than the subtotal.');
 const discounted=subtotal-cents(discount),taxCents=Math.round(discounted*tax/100);
 return {lines:lines.map(line=>line/100),subtotal:subtotal/100,discount:cents(discount)/100,tax:taxCents/100,total:(discounted+taxCents)/100};
}
export function buildInvoice(input:InvoiceInput):WordPDFModel{
 const totals=invoiceTotals(input.items,input.tax,input.discount);
 if(!input.from.trim()||!input.to.trim())throw new FileInputError('Enter your details and the recipient’s details.');
 if(input.from.length>2000||input.to.length>2000||input.note.length>2000||!input.number.trim()||input.number.length>80)throw new FileInputError('Use a short invoice number and details under 2,000 characters.');
 const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 if(!validDate(input.date)||input.due&&(!validDate(input.due)||input.due<input.date))throw new FileInputError('Choose a valid invoice date. The due date must be on or after it.');
 if(!['USD','EUR','GBP','PKR','INR','AED','CAD','AUD'].includes(input.currency))throw new FileInputError('Choose a supported invoice currency.');
 const money=(value:number)=>`${input.currency} ${value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 const paragraph=(text:string,size=11,bold=false,after=6,align:Paragraph['align']='left'):Paragraph=>({type:'paragraph',runs:[{text,size,bold}],align,before:0,after,indent:0,line:1.2});
 const cell=(text:string,bold=false,align:Paragraph['align']='left')=>({paragraphs:[paragraph(text,10,bold,4,align)],span:1});
 const table:Table={type:'table',widths:[240,56,102,117],rows:[{header:true,cells:[cell('Description',true),cell('Qty',true,'right'),cell('Unit price',true,'right'),cell('Amount',true,'right')]},...input.items.map((item,index)=>({header:false,cells:[cell(item.description),cell(String(item.quantity),false,'right'),cell(money(item.price),false,'right'),cell(money(totals.lines[index]),false,'right')]}))]};
 return {width:595.28,height:841.89,left:40,right:40,top:40,bottom:40,warnings:[],blocks:[paragraph('INVOICE',25,true,12),paragraph(input.number,12,true),paragraph('Invoice date: '+input.date+(input.due?'   •   Due: '+input.due:'')),paragraph('From',11,true,3),...input.from.trim().split('\n').map(line=>paragraph(line,11,false,2)),paragraph('Bill to',11,true,3),...input.to.trim().split('\n').map(line=>paragraph(line,11,false,2)),paragraph('',11,false,14),table,paragraph('Subtotal: '+money(totals.subtotal),11,false,5,'right'),paragraph('Discount: '+money(totals.discount),11,false,5,'right'),paragraph(`Tax (${input.tax}%): `+money(totals.tax),11,false,5,'right'),paragraph('Total due: '+money(totals.total),15,true,14,'right'),...(input.note.trim()?[paragraph('Notes',11,true,3),...input.note.trim().split('\n').map(line=>paragraph(line))]:[])]};
}

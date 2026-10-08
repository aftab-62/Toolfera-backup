// Server-rendered editorial data. Do not import this catalog into navigation/search clients.
import type {Article} from './article-types';
import compression from './articles/reduce-pdf-file-size-without-losing-quality.json' with {type:'json'};
import editable from './articles/make-pdf-editable-native-text-or-ocr.json' with {type:'json'};
import scanned from './articles/scanned-vs-searchable-pdf.json' with {type:'json'};
import merge from './articles/combine-pdf-files-in-the-right-order.json' with {type:'json'};
import formats from './articles/jpeg-png-webp-which-format.json' with {type:'json'};
import dimensions from './articles/image-dimensions-vs-file-size.json' with {type:'json'};
import imagePdf from './articles/jpg-png-to-pdf-page-size-margins.json' with {type:'json'};
import gpa from './articles/gpa-vs-cgpa-credit-weighted.json' with {type:'json'};
import percentages from './articles/percentage-vs-percentage-points.json' with {type:'json'};
import attendance from './articles/attendance-percentage-target-classes.json' with {type:'json'};
import json from './articles/fix-invalid-json.json' with {type:'json'};
import encoding from './articles/base64-vs-url-encoding.json' with {type:'json'};
import qr from './articles/qr-code-not-scanning-print-checklist.json' with {type:'json'};
import text from './articles/word-character-count-unicode.json' with {type:'json'};
export const articles:Article[]=[compression,editable,scanned,merge,formats,dimensions,imagePdf,gpa,percentages,attendance,json,encoding,qr,text];
export const articleUrl=(a:Pick<Article,'slug'>)=>`/blog/${a.slug}/`;
export const getArticle=(slug:string)=>articles.find(a=>a.slug===slug);
export function articleWordCount(a:Article){return [a.title,a.intro,...a.sections.flatMap(s=>[s.title,...s.paragraphs,...(s.list||[]),...(s.table?.rows.flat()||[]),s.code||'']),a.conclusion].join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').trim().split(/\s+/).length;}

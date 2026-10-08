import {ScanLine,Braces,LockKeyhole,Image,Files,QrCode,Fuel} from 'lucide-react';
export function ToolPreview({id}:{id:string}){
 const content=id==='image-compressor'?<><span className="mini-label">Example compression</span><div className="mini-size"><span>4.8 MB</span><i/><strong>1.2 MB</strong></div><div className="mini-bar"><i/></div><span className="mini-caption">75% smaller · results vary by image</span></>
 :id==='image-resizer'?<><ScanLine size={22}/><span className="mini-label">Example resize</span><div className="mini-dimensions"><span>2400 × 1600</span><strong>1200 × 800</strong></div></>
 :id==='image-converter'?<><Image size={20}/><span className="mini-label">Choose your format</span><div className="mini-formats"><span>JPEG</span><span>PNG</span><span>WebP</span></div></>
 :id==='pdf-merger'?<><Files size={20}/><span className="mini-label">Example document merge</span><div className="mini-formats"><span>12 pages</span><span>+ 4 pages</span></div><strong className="mini-number">16<span>pages, one PDF</span></strong></>
 :id==='pdf-to-jpg'?<><Files size={20}/><span className="mini-label">From pages to pictures</span><div className="mini-formats"><span>PDF</span><span>→ JPG / PNG</span></div><span className="mini-caption">Choose pages · download a ZIP</span></>
 :id==='qr-code-generator'?<><QrCode size={28}/><span className="mini-label">A link, ready to scan</span><div className="mini-formats"><span>PNG</span><span>SVG</span></div></>
 :id==='fuel-cost-calculator'?<><Fuel size={23}/><span className="mini-label">Your journey, your units</span><div className="mini-formats"><span>km / miles</span><span>30 currencies</span></div></>
 :id==='percentage-calculator'?<><span className="mini-label">15% of 200</span><strong className="mini-number">30<span>the result</span></strong></>
 :id==='gpa-calculator'||id==='cgpa-calculator'?<><span className="mini-label">Credit-weighted grades</span><div className="mini-grades"><span>3 credits <b>4.0</b></span><span>3 credits <b>3.5</b></span><strong>3.75 <small>GPA</small></strong></div></>
 :id==='word-counter'||id==='character-counter'?<><span className="mini-label">Example text count</span><div className="mini-text-count"><strong>542<small>words</small></strong><span>3 min<br/>read</span></div></>
 :id==='json-formatter'?<><Braces size={18}/><span className="mini-label">Readable in a moment</span><code>{'{'}<br/>&nbsp; <span>&quot;formatted&quot;</span>: true<br/>{'}'}</code></>
 :id==='password-generator'?<><LockKeyhole size={20}/><span className="mini-label">Cryptographic randomness</span><div className="mini-password">•••• •••• ••••</div></>:null;
 return content?<div className={`tool-mini-preview mini-${id}`} aria-hidden="true">{content}</div>:null;
}

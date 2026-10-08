import {BrandWordmark} from './brand-wordmark';
import {useId} from 'react';
import {SiteLink} from './site-link';
export function BrandMark(){const surface=useId();return <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id={surface} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#294678"/><stop offset="1" stopColor="#142544"/></linearGradient></defs><rect width="64" height="64" rx="17" fill={`url(#${surface})`}/><rect x=".75" y=".75" width="62.5" height="62.5" rx="16.25" fill="none" stroke="#b6d7ff" strokeOpacity=".3" strokeWidth="1.5"/><path d="M17 2h30" stroke="#d6eaff" strokeOpacity=".38" strokeLinecap="round"/><path d="M13 16h38v7H31v27h-7V23H13z" fill="#fff"/><path d="M35 28h17v7H42v15h-7z" fill="#5685ff"/><path d="M42 39h10v7H42z" fill="#73d8ee"/></svg>}
export function Logo(){return <SiteLink className="logo" href="/" aria-label="Tool Fera home"><BrandMark/><BrandWordmark/></SiteLink>}

import type { AnchorHTMLAttributes } from 'react';

/** Real document navigation preserves modifier clicks, downloads and SSR links. */
export function SiteLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & {href:string}) {
  return <a {...props}/>;
}

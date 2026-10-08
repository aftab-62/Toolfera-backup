import {toolCategories} from '@/lib/tool-definitions';

// Progressive enhancement for supporting browsers: only the HTML response is
// prefetched after navigation intent. No prerendering, engines, workers or WASM.
// Plain anchors remain the reliable fallback, including modifier clicks.
export function RoutePrefetch(){
 const rules={prefetch:[{source:'document',where:{and:[
  {href_matches:toolCategories.map(category=>`/${category.slug}/*`)},
  {not:{selector_matches:'[download], [target="_blank"], [data-no-prefetch]'}}
 ]},eagerness:'moderate'}]};
 return <script type="speculationrules" dangerouslySetInnerHTML={{__html:JSON.stringify(rules).replace(/</g,'\\u003c')}}/>;
}

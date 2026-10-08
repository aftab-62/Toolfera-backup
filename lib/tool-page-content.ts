import data from './tool-page-content.json' with {type:'json'};
export type ToolPageContent={title:string;paragraphs:string[];example:string;related:string[];guides:string[]};
// Editorial context is server-only; algorithms and the lean tool registry stay unchanged.
export const toolPageContent:Record<string,ToolPageContent>=data;

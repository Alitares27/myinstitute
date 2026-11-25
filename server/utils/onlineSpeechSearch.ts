import {officialSpeechUrl} from './speechReference';
import {InputError} from './validation';

export type OnlineSpeech={title:string;author:string;conference:string;url:string;snippet:string;topics:string[]};
export type SpeechSearchResults={items:OnlineSpeech[];page:number;hasNext:boolean};
const cache=new Map<string,{until:number;value:SpeechSearchResults}>();
const inFlight=new Map<string,Promise<SpeechSearchResults>>();
const endpoint='https://www.churchofjesuschrist.org/search/proxy/general-conference-search';
const filter='siteSearch:"churchofjesuschrist.org/study/general-conference" AND (siteSearch:"*lang=spa*" OR -siteSearch:"*lang=*")';
const text=(value:unknown,max:number)=>typeof value==='string'?value.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g,entity=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[entity]||'')).replace(/&#(x[0-9a-f]+|\d+);/gi,(_match,code)=>{const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/\s+/g,' ').trim().slice(0,max):'';

// The official website's public response is adapted here so upstream changes do not leak into the UI.
export function parseSpeechSearch(data:any,page:number):SpeechSearchResults{
  if(!data||!Array.isArray(data.results))throw new Error('Unexpected search response');
  const items:OnlineSpeech[]=[],seen=new Set<string>();
  for(const result of data.results.slice(0,20)){
    const fields=result?.document?.derivedStructData?.fields;
    const metadata=result?.document?.structData?.fields;
    let url:string;try{url=officialSpeechUrl(fields?.link?.stringValue);}catch{continue;}
    if(seen.has(url))continue;
    const title=text(fields?.title?.stringValue,250);if(!title)continue;
    const author=text(metadata?.author_name?.listValue?.values?.[0]?.stringValue||metadata?.author_name?.stringValue,150);
    const match=new URL(url).pathname.match(/\/(\d{4})\/(04|10)\//)!;
    const conference=`${match[2]==='04'?'Abril':'Octubre'} de ${match[1]}`;
    const snippet=text(fields?.snippets?.listValue?.values?.[0]?.structValue?.fields?.snippet?.stringValue,400);
    seen.add(url);items.push({title,author,conference,url,snippet,topics:[]});
  }
  return {items,page,hasNext:page<100&&Boolean(data.nextPageToken)};
}
export async function searchOnlineSpeeches(query:unknown,pageValue:unknown=1):Promise<SpeechSearchResults>{
  if(typeof query!=='string'||query.trim().length<2||query.trim().length>180||/[\u0000-\u001f]/.test(query))throw new InputError('Escribe entre 2 y 180 caracteres para buscar.');
  const page=Number(pageValue);if(!Number.isSafeInteger(page)||page<1||page>100)throw new InputError('Página de búsqueda inválida.');
  const term=query.trim().replace(/\s+/g,' '),key=JSON.stringify([term.toLocaleLowerCase('es'),page]);
  const stored=cache.get(key);if(stored&&stored.until>Date.now())return stored.value;
  const pending=inFlight.get(key);if(pending)return pending;
  const request=(async()=>{
    const url=new URL(endpoint);url.search=new URLSearchParams({query:term,page:String(page),filter}).toString();
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!response.ok)throw new Error('Official search unavailable');
    // Bound responses even when Content-Length is absent.
    const reader=response.body?.getReader();if(!reader)throw new Error('Missing search response');
    const chunks:Uint8Array[]= [];let bytes=0;
    try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1500000)throw new Error('Search response too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    const result=parseSpeechSearch(JSON.parse(Buffer.concat(chunks).toString('utf8')),page);
    for(const [cacheKey,value] of cache)if(value.until<Date.now())cache.delete(cacheKey);
    if(cache.size>=60)cache.delete(cache.keys().next().value!);
    cache.set(key,{until:Date.now()+600000,value:result});return result;
  })();
  inFlight.set(key,request);try{return await request;}finally{inFlight.delete(key);}
}

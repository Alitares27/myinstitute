import { createHash } from "node:crypto";
import type { Plugin } from "vite";
export function pwa():Plugin {
  return {
    name:"gestionar-pwa",apply:"build",
    transformIndexHtml(){return [{tag:"link",attrs:{rel:"manifest",href:"/manifest.webmanifest"},injectTo:"head"},{tag:"script",attrs:{src:"/registerSW.js",defer:true},injectTo:"head"}];},
    generateBundle(_options,bundle){
      const initial=new Set<string>();
      const visit=(name:string)=>{if(initial.has(name))return;initial.add(name);const item=bundle[name];if(item?.type==="chunk")for(const dependency of item.imports)visit(dependency);};
      for(const [name,item] of Object.entries(bundle))if(item.type==="chunk"&&item.isEntry)visit(name);
      for(const name of Object.keys(bundle))if(name.endsWith(".css"))initial.add(name);
      const assets=["/index.html","/manifest.webmanifest","/temple.webp","/icon-192x192.png","/icon-512x512.png","/icon-maskable-512x512.png",...[...initial].map(name=>`/${name}`)];
      const revision=createHash("sha256").update(JSON.stringify(Object.keys(bundle).sort())).digest("hex").slice(0,16);
      this.emitFile({type:"asset",fileName:"manifest.webmanifest",source:JSON.stringify({name:"GestionAR - Sistema de Gestión",short_name:"GestionAR",description:"Sistema de gestión para instituto religioso",theme_color:"#007AFF",background_color:"#F2F2F7",display:"standalone",start_url:"/",scope:"/",lang:"es",icons:[{src:"icon-192x192.png",sizes:"192x192",type:"image/png"},{src:"icon-512x512.png",sizes:"512x512",type:"image/png"},{src:"icon-maskable-512x512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]})});
      this.emitFile({type:"asset",fileName:"registerSW.js",source:`if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(reg=>reg.update()).catch(()=>{}));`});
      this.emitFile({type:"asset",fileName:"sw.js",source:`
const PREFIX='gestionar-static-';
const STATIC=PREFIX+${JSON.stringify(revision)};
const RUNTIME=STATIC+'-runtime';
const PRECACHE=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(STATIC).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>(name.startsWith(PREFIX)||['api-cache','app-chunks-cache','google-fonts-cache','gstatic-fonts-cache'].includes(name)||name.startsWith('workbox-precache-'))&&![STATIC,RUNTIME].includes(name)).map(name=>caches.delete(name)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  // Private API requests and cross-origin responses never enter Cache Storage.
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.open(STATIC).then(cache=>cache.match('/index.html'))));return;
  }
  if(!url.pathname.startsWith('/assets/')&&!PRECACHE.includes(url.pathname))return;
  event.respondWith((async()=>{
    const initial=await caches.open(STATIC),cached=await initial.match(request);if(cached)return cached;
    const runtime=await caches.open(RUNTIME),previous=await runtime.match(request);if(previous)return previous;
    const response=await fetch(request);
    if(response.ok&&response.type==='basic'){
      await runtime.put(request,response.clone());const keys=await runtime.keys();
      await Promise.all(keys.slice(0,Math.max(0,keys.length-80)).map(key=>runtime.delete(key)));
    }
    return response;
  })());
});
`});
    }
  };
}

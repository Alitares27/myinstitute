import { createHash } from "node:crypto";
import type { Plugin } from "vite";
export function pwa(): Plugin {
  return {
    name: "gestionar-pwa", apply: "build",
    transformIndexHtml() { return [{ tag: "link", attrs: { rel: "manifest", href: "/manifest.webmanifest" }, injectTo: "head" }, { tag: "script", attrs: { src: "/registerSW.js", defer: true }, injectTo: "head" }]; },
    generateBundle(_options, bundle) {
      const initial = new Set<string>();
      const visit = (name: string) => { if (initial.has(name)) return; initial.add(name); const item = bundle[name]; if (item?.type === "chunk") for (const dependency of item.imports) visit(dependency); };
      for (const [name, item] of Object.entries(bundle)) if (item.type === "chunk" && item.isEntry) visit(name);
      for (const name of Object.keys(bundle)) if (name.endsWith(".css")) initial.add(name);
      const assets = ["/index.html", "/manifest.webmanifest", "/temple.webp", "/icon-192x192.png", "/icon-512x512.png", "/icon-maskable-512x512.png", ...[...initial].map(name => `/${name}`)];
      const revision = createHash("sha256").update(JSON.stringify(Object.keys(bundle).sort())).digest("hex").slice(0, 16);
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: JSON.stringify({ name: "GestionAR - Sistema de Gestión", short_name: "GestionAR", description: "Sistema de gestión para instituto religioso", theme_color: "#6750A4", background_color: "#F2F2F7", display: "standalone", start_url: "/", scope: "/", lang: "es", icons: [{ src: "icon-192x192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512x512.png", sizes: "512x512", type: "image/png" }, { src: "icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }) });
      this.emitFile({ type: "asset", fileName: "registerSW.js", source: `if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(reg=>reg.update()).catch(()=>{}));` });
      this.emitFile({
        type: "asset", fileName: "sw.js", source: `
const PREFIX='gestionar-static-';
const STATIC=PREFIX+${JSON.stringify(revision)};
const RUNTIME=STATIC+'-runtime';
const PRECACHE=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(STATIC).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>(name.startsWith(PREFIX)||['api-cache','app-chunks-cache','google-fonts-cache','gstatic-fonts-cache'].includes(name)||name.startsWith('workbox-precache-'))&&![STATIC,RUNTIME].includes(name)).map(name=>caches.delete(name)))).then(()=>self.clients.claim())));
self.addEventListener('sync',event=>{if(event.tag==='gestionar-outbox')event.waitUntil(syncOfflineOutbox());});
function idbRequest(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function openOfflineDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('gestionar-offline-v1',3);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('responses')){const store=db.createObjectStore('responses',{keyPath:'key'});store.createIndex('userId','userId',{unique:false});}if(!db.objectStoreNames.contains('outbox')){const store=db.createObjectStore('outbox',{keyPath:'id'});store.createIndex('userId','userId',{unique:false});}if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'userId'});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});};request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=()=>reject(request.error);});}
async function acquireWorkerLock(db,owner){return new Promise(resolve=>{const tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta'),request=store.get('sync-lock');let acquired=false;request.onsuccess=()=>{if(!request.result||request.result.expiresAt<=Date.now()){store.put({key:'sync-lock',owner,expiresAt:Date.now()+120000});acquired=true;}};tx.oncomplete=()=>resolve(acquired);tx.onerror=tx.onabort=()=>resolve(false);});}
async function releaseWorkerLock(db,owner){return new Promise(resolve=>{const tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta'),request=store.get('sync-lock');request.onsuccess=()=>{if(request.result?.owner===owner)store.delete('sync-lock');};tx.oncomplete=tx.onerror=tx.onabort=()=>resolve();});}
async function syncOfflineOutbox(){
  const db=await openOfflineDb();
  const owner=crypto.randomUUID();if(!await acquireWorkerLock(db,owner)){db.close();return;}
  try{
    const sessionTx=db.transaction('sessions','readonly');
    const sessions=await idbRequest(sessionTx.objectStore('sessions').getAll());
    for(const session of sessions){
      const readTx=db.transaction('outbox','readonly');
      const entries=await idbRequest(readTx.objectStore('outbox').index('userId').getAll(session.userId));
      entries.sort((left,right)=>left.createdAt-right.createdAt);
      for(const entry of entries){
        let response;
        try{response=await fetch(session.apiBase+entry.url,{method:entry.method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token,'X-Offline-Queue-Id':entry.id},...(entry.data===undefined?{}:{body:JSON.stringify(entry.data)})});}
        catch{throw new Error('offline');}
        if(!response.ok){if(response.status===429||response.status>=500)throw new Error('retry');break;}
        const data=await response.json().catch(()=>({}));
        const createdId=data?.id??data?.user?.id;
        if(entry.localId&&createdId!=null){
          const pendingTx=db.transaction('outbox','readwrite');
          const pending=pendingTx.objectStore('outbox');
          const queued=await idbRequest(pending.index('userId').getAll(session.userId));
          for(const item of queued){if(item.id===entry.id||item.localId===entry.localId)continue;const replace=(value)=>{if(value===entry.localId||value===String(entry.localId))return createdId;if(Array.isArray(value))return value.map(replace);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,nested])=>[key,replace(nested)]));return value;};item.url=item.url.replace(new RegExp('(^|[^\\d])'+entry.localId+'(?=$|[^\\d])','g'),'$1'+createdId);item.data=replace(item.data);pending.put(item);}
        }
        const deleteTx=db.transaction('outbox','readwrite');deleteTx.objectStore('outbox').delete(entry.id);
      }
    }
  }finally{await releaseWorkerLock(db,owner);db.close();const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients)client.postMessage({type:'gestionar:offline-sync-complete'});}
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
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

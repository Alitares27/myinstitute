const {spawn}=require("node:child_process");
const assert=require("node:assert/strict");
const path=require("node:path");
(async()=>{
 const child=spawn(process.execPath,["node_modules/vite/bin/vite.js","preview","--host","127.0.0.1","--port","4179","--strictPort"],{cwd:path.resolve(__dirname,".."),windowsHide:true,stdio:["ignore","pipe","pipe"]});
 try {
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error("Preview startup timeout")),15000);
   child.once("error",reject);child.once("exit",code=>{clearTimeout(timer);reject(new Error(`Preview exited ${code}`));});
   child.stdout.on("data",chunk=>{if(chunk.toString().includes("4179")){clearTimeout(timer);resolve();}});
  });
  const base="http://127.0.0.1:4179";
  const index=await fetch(base);assert.equal(index.status,200);const html=await index.text();
  const assets=[...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(match=>match[1]);
  for(const asset of assets)assert.equal((await fetch(base+asset)).status,200,asset);
  for(const route of ["/iniciar-sesion","/panel","/reservar-viajes","/miembros","/usuarios"])assert.equal((await fetch(base+route)).status,200,route);
  const manifest=await (await fetch(base+"/manifest.webmanifest")).json();
  for(const icon of manifest.icons)assert.equal((await fetch(base+"/"+icon.src)).status,200,icon.src);
  assert.equal((await fetch(base+"/sw.js")).status,200);
  console.log(`PASS: production preview starts; SPA routes, ${assets.length} assets, manifest icons and service worker load`);
 } finally {child.kill();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

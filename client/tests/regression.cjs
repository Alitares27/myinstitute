const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"), path=require("node:path"), vm=require("node:vm");
const {createRequire}=require("node:module");
const ts=require("typescript");
const {JSDOM}=require("jsdom");
const dom=new JSDOM("<!doctype html><div id='root'></div>",{url:"https://example.test"});
global.window=dom.window;global.document=dom.window.document;global.localStorage=dom.window.localStorage;
function load(file, api={get:async()=>({data:[]})}) {
  const filename=path.resolve(__dirname,"../src",file), mod={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const localRequire=createRequire(filename);
  vm.runInNewContext(js,{exports:mod.exports,module:mod,require:name=>name==="../api"?{__esModule:true,default:api}:localRequire(name),window,document,localStorage,Map,Date,setTimeout,Promise,console},{filename});
  return mod.exports;
}
test("report sanitizer removes stored XSS from names, documents, URLs and nested SVG",()=>{
  const {buildReportDocument}=load("utils/utilidadesReportes.ts");
  const attacks=[`<img src=x onerror="alert(1)">`,`<script>alert(1)</script>`,`<svg><g onload="alert(1)"></g></svg>`,`<a href="javascript:alert(1)">x</a>`,`<iframe srcdoc="<script>alert(1)</script>"></iframe>`];
  for(const attack of attacks) {
    const html=buildReportDocument(attack,attack,`<table><tr><td>${attack}</td></tr></table>`);
    const doc=new JSDOM(html).window.document;
    assert.equal(doc.querySelectorAll("script,svg,iframe,a").length,0);
    assert.equal(doc.querySelectorAll("[onerror],[onload]").length,0);
    assert.ok(doc.querySelector("table"));
    assert.equal(doc.title,attack);
    assert.match(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content,/default-src 'none'/);
  }
});
test("cache never shares private catalogs between tokens and invalidates prefixes",async()=>{
  let requests=0;const cache=load("utils/clienteCache.ts",{get:async()=>({data:[++requests]})});
  localStorage.setItem("token","user-a");assert.equal((await cache.obtenerEstudiantes())[0],1);
  assert.equal((await cache.obtenerEstudiantes())[0],1);
  localStorage.setItem("token","user-b");assert.equal((await cache.obtenerEstudiantes())[0],2);
  cache.invalidarEstudiantes();assert.equal((await cache.obtenerEstudiantes())[0],3);
  cache.invalidarCache();assert.equal((await cache.obtenerEstudiantes())[0],4);
});
test("logout removes authentication and legacy API cache while retaining theme",async()=>{
  const deleted=[]; window.caches={delete:async name=>{deleted.push(name);return true;}};
  const filename=path.resolve(__dirname,"../src/utils/sesion.ts"),mod={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  localStorage.setItem("theme","dark");localStorage.setItem("token","secret");localStorage.setItem("user","private");localStorage.setItem("role","admin");
  vm.runInNewContext(js,{exports:mod.exports,module:mod,window,localStorage,caches:window.caches,Promise});
  await mod.exports.limpiarSesion();
  for(const key of ["token","user","role"]) assert.equal(localStorage.getItem(key),null);
  assert.equal(localStorage.getItem("theme"),"dark");assert.deepEqual(deleted,["api-cache"]);
});

function loadComponent(relativeFile,api) {
  const modules=new Map();
  function compile(filename) {
    if(modules.has(filename))return modules.get(filename).exports;
    const mod={exports:{}};modules.set(filename,mod);
    const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const req=createRequire(filename);
    function resolve(name) {
      if(name.endsWith(".css"))return {};
      if(name.startsWith(".")) {
        const target=path.resolve(path.dirname(filename),name);
        if(target.endsWith(path.sep+"api"))return {__esModule:true,default:api};
        const source=[target,target+".ts",target+".tsx"].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
        return compile(source);
      }
      return req(name);
    }
    new Function("require","module","exports",js)(resolve,mod,mod.exports);
    return mod.exports;
  }
  return compile(path.resolve(__dirname,"../src",relativeFile)).default;
}
test("reservation form keeps entered values after server rejection and consumes server pagination",async()=>{
  const React=require("react"),{act}=React,{createRoot}=require("react-dom/client"),{Simulate}=require("react-dom/test-utils"),{MemoryRouter}=require("react-router-dom");
  global.IS_REACT_ACT_ENVIRONMENT=true;
  localStorage.setItem("token","ui-admin");localStorage.setItem("user",JSON.stringify({id:1,role:"admin"}));
  const calls=[];
  const api={get:async(url,config)=>{
    calls.push([url,config]);
    if(url==="/users")return {data:[{id:5,name:"Test Member"}]};
    if(url==="/temple-trips")return {data:[{id:1,date:"2999-12-01",status:"programado",cost:100}]};
    if(url==="/trip-reservations/options")return {data:[]};
    if(url==="/trip-reservations")return {data:{items:[],total:20,total_paid:30,total_pending:70}};
    throw new Error("Unexpected request "+url);
  },post:async()=>{throw {response:{data:{message:"Reserva rechazada"}}};}};
  const Component=loadComponent("pages/ReservarViajes.tsx",api);
  const container=document.createElement("div");document.body.appendChild(container);const root=createRoot(container);
  await act(async()=>{root.render(React.createElement(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Component)));});
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,260));});
  assert.ok(container.textContent.includes("20"));
  assert.equal(calls.find(([url])=>url==="/trip-reservations")[1].params.limit,5);
  await act(async()=>{Simulate.change(container.querySelector('select[name="trip_id"]'),{target:{name:"trip_id",value:"1"}});});
  await act(async()=>{Simulate.change(container.querySelector('select[name="user_id"]'),{target:{name:"user_id",value:"5"}});});
  await act(async()=>{Simulate.change(container.querySelector('input[name="advance_payment"]'),{target:{name:"advance_payment",value:"20"}});});
  await act(async()=>{Simulate.submit(container.querySelector("form"));});
  assert.equal(container.querySelector('input[name="advance_payment"]').value,"20");
  assert.equal(container.querySelector('select[name="user_id"]').value,"5");
  assert.ok(container.querySelector('[role="alert"]').textContent.includes("Reserva rechazada"));
  await act(async()=>root.unmount());container.remove();
});

test("concurrent catalog loads share a request and invalidation rejects late stale cache writes",async()=>{
  let resolve,requests=0;
  const cache=load("utils/clienteCache.ts");
  localStorage.setItem("token","concurrent-user");
  const fetcher=()=>{requests++;return new Promise(done=>{resolve=done;});};
  const first=cache.fetchConCache("test",fetcher),second=cache.fetchConCache("test",fetcher);
  assert.equal(requests,1);
  cache.invalidarCache("test");resolve("old");await Promise.all([first,second]);
  const fresh=await cache.fetchConCache("test",async()=>{requests++;return "new";});
  assert.equal(fresh,"new");assert.equal(requests,2);
});

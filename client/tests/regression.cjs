const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"), path=require("node:path"), vm=require("node:vm");
const {createRequire}=require("node:module");
const ts=require("typescript");
const {JSDOM}=require("jsdom");
const dom=new JSDOM("<!doctype html><div id='root'></div>",{url:"https://example.test"});
global.window=dom.window;global.document=dom.window.document;global.localStorage=dom.window.localStorage;
function load(file, api={get:async()=>({data:[]})}, modules={}) {
  const filename=path.resolve(__dirname,"../src",file), mod={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const localRequire=createRequire(filename);
  vm.runInNewContext(js,{exports:mod.exports,module:mod,require:name=>name==="../api"?{__esModule:true,default:api}:modules[name] ?? localRequire(name),window,document,localStorage,URL:window.URL,Map,Date,setTimeout,Promise,console},{filename});
  return mod.exports;
}
test("report sanitizer removes stored XSS from names, documents, URLs and nested SVG",()=>{
  const {buildReportDocument}=load("utils/utilidadesReportes.ts", undefined, { "./androidReports": { isAndroidApp: () => false } });
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
test("Android prints sanitized reports without opening a browser window",async()=>{
  let printed;
  const {openPrintWindow}=load("utils/utilidadesReportes.ts",undefined,{
    "./androidReports": {
      isAndroidApp:()=>true,
      AndroidReports:{printHtml:async report=>{printed=report;}}
    }
  });
  const originalOpen=window.open;
  window.open=()=>assert.fail("Android must not open a report window");
  try {
    await openPrintWindow("Reporte","Asistencia","<table><tr><td>Presentes</td></tr></table><script>alert(1)</script>");
    assert.equal(printed.title,"Reporte");
    assert.match(printed.html,/<td>Presentes<\/td>/);
    assert.doesNotMatch(printed.html,/<script>/);
  } finally {
    window.open=originalOpen;
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
test("a protected 401 invalidates the rejected session once and prompts sign-in", async () => {
  const filename = path.resolve(__dirname, "../src/api.ts");
  const source = fs.readFileSync(filename, "utf8").replace("import.meta.env.VITE_API_URL", "undefined");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let rejectResponse;
  let cleanups = 0;
  let redirect;
  const api = { interceptors: {
    request: { use() {} },
    response: { use(_success, failure) { rejectResponse = failure; } }
  } };
  const modules = {
    axios: { default: { create: () => api } },
    "./utils/sesion": { limpiarSesion: async () => { cleanups++; localStorage.removeItem("token"); } },
    "./services/offlineSync": {}
  };
  const browser = {
    location: { pathname: "/agendas" },
    history: { replaceState(_state, _title, url) { redirect = url; } },
    dispatchEvent() {}
  };
  vm.runInNewContext(js, {
    exports: {}, require: name => modules[name], window: browser, localStorage,
    PopStateEvent: window.PopStateEvent, Promise
  });
  localStorage.setItem("token", "current");
  const error = url => ({ config: { url, headers: { Authorization: "Bearer current" } }, response: { status: 401 } });
  await assert.rejects(rejectResponse(error("/users/login")));
  assert.equal(cleanups, 0);
  await Promise.allSettled([rejectResponse(error("/agendas")), rejectResponse(error("/courses"))]);
  assert.equal(cleanups, 1);
  assert.equal(redirect, "/iniciar-sesion?sesion=expirada");
});
test("logout removes authentication and legacy API cache while retaining theme",async()=>{
  const deleted=[]; window.caches={delete:async name=>{deleted.push(name);return true;}};
  const filename=path.resolve(__dirname,"../src/utils/sesion.ts"),mod={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  localStorage.setItem("theme","dark");localStorage.setItem("token","secret");localStorage.setItem("user","private");localStorage.setItem("role","admin");
  vm.runInNewContext(js,{exports:mod.exports,module:mod,window,localStorage,caches:window.caches,Promise,require:()=>({forgetOfflineSession:async()=>{},invalidarCache:()=>{},clearAndroidReminders:async()=>{}})});
  await mod.exports.limpiarSesion();
  for(const key of ["token","user","role"]) assert.equal(localStorage.getItem(key),null);
  assert.equal(localStorage.getItem("theme"),"dark");assert.deepEqual(deleted,["api-cache"]);
});

function loadComponent(relativeFile,api,withTheme=false) {
  const modules=new Map();
  function compile(filename) {
    if(filename.endsWith(".json"))return JSON.parse(fs.readFileSync(filename,"utf8"));
    if(modules.has(filename))return modules.get(filename).exports;
    const mod={exports:{}};modules.set(filename,mod);
    const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const req=createRequire(filename);
    function resolve(name) {
      if(name.endsWith(".css"))return {};
      if(name.startsWith(".")) {
        const target=path.resolve(path.dirname(filename),name);
        if(target.endsWith(path.sep+"offlineSync"))return {forgetOfflineSession:async()=>{},getOfflineState:async()=>({online:true,pending:0,syncing:false,message:""}),listPendingChanges:async()=>[],subscribeOfflineState:()=>()=>{},synchronizePendingChanges:async()=>{}};
        if(target.endsWith(path.sep+"api"))return {__esModule:true,default:api};
        const source=[target,target+".ts",target+".tsx"].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
        return compile(source);
      }
      return req(name);
    }
    new Function("require","module","exports",js)(resolve,mod,mod.exports);
    return mod.exports;
  }
  const Component=compile(path.resolve(__dirname,"../src",relativeFile)).default;
  if(withTheme){const {ThemeProvider}=compile(path.resolve(__dirname,"../src/context/ContextoTema.tsx"));const React=require('react');return props=>React.createElement(ThemeProvider,null,React.createElement(Component,props));}
  return Component;
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
  assert.equal(calls.find(([url,config])=>url==="/trip-reservations"&&!config.params.trip_id)[1].params.limit,7);
  assert.equal(container.querySelector('form'),null);
  const addReservation = container.querySelector('.reservation-header-actions [aria-label="Reservar viaje"]');
  await act(async()=>Simulate.click(addReservation));
  assert.ok(container.querySelector('.modal-overlay [role="dialog"] form'));
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

async function mountPage(filename,api,user={id:1,role:"admin"},withTheme=false) {
 const React=require("react"),{act}=React,{createRoot}=require("react-dom/client"),{MemoryRouter}=require("react-router-dom");
 global.IS_REACT_ACT_ENVIRONMENT=true;
 global.getComputedStyle=window.getComputedStyle.bind(window);
 window.matchMedia ||= ()=>({matches:false,addEventListener(){},removeEventListener(){}});
 localStorage.setItem("token","test-"+user.id);localStorage.setItem("user",JSON.stringify(user));
 const Component=loadComponent(filename,api,withTheme),node=document.createElement("div");document.body.appendChild(node);const root=createRoot(node);
 await act(async()=>root.render(React.createElement(MemoryRouter,null,React.createElement(Component))));
 return {node,act,async wait(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,190));});},async close(){await act(async()=>root.unmount());node.remove();}};
}
test("student sees own enrollment when users.id differs from students.id",async()=>{
 const api={get:async(url)=>({data:url==="/enrollments"?[{id:1,student_id:7,course_id:1}]:url==="/students"?[{id:7,user_id:42,name:"Own Member"}]:url==="/courses"?[{id:1,title:"Own Course"}]:[]})};
 const view=await mountPage("pages/Inscripciones.tsx",api,{id:42,role:"student"});
 assert.ok(view.node.querySelector("tbody").textContent.includes("Own Course"));
 assert.ok(!view.node.textContent.includes("No se encontraron matrículas"));await view.close();
});
test("payment page displays reservation-level debt and server totals, not repeated row balances",async()=>{
 const api={get:async(url)=>({data:url==="/temple-trips"?[{id:1,date:"2999-01-01",status:"programado",temple_name:"Upcoming"}]:url==="/temple-amortizations"?{items:[{id:1,attendance_id:10,miembro_nombre:"Member",payment_amount:20,monto_adeudado:50,payment_date:"2026-01-01"},{id:2,attendance_id:10,miembro_nombre:"Member",payment_amount:10,monto_adeudado:50,payment_date:"2026-01-02"}],total:2,summary:{totalPagado:30,totalAdeudado:150,totalSaldados:0}}:[]})};
 const view=await mountPage("pages/PagosTemplos.tsx",api);await view.wait();
 const figures=[...view.node.querySelectorAll(".asistencia-stat-content h3")].map(item=>item.textContent);
 assert.deepEqual(figures,["2","$30","$150","0"]);await view.close();
});
test("slow response for old payment filter cannot replace the current filter",async()=>{
 const {Simulate}=require("react-dom/test-utils");const pending=new Map();
 const pageData=name=>({data:{items:[{id:name==="Latest"?2:1,attendance_id:10,miembro_nombre:name,payment_amount:10,monto_adeudado:50,payment_date:"2026-01-01"}],total:1,summary:{totalAdeudado:50}}});
 const api={get:async(url,config)=>{
  if(url==="/temple-trips")return {data:[{id:1,date:"2999-01-01"},{id:2,date:"2999-02-01"}]};
  if(url==="/users")return {data:[]};
  if(url==="/temple-amortizations") {
   const trip=config.params.trip_id;if(!trip)return {data:{items:[],total:0,summary:{}}};
   return new Promise(resolve=>pending.set(trip,{resolve,signal:config.signal}));
  }
  return {data:[]};
 }};
 const view=await mountPage("pages/PagosTemplos.tsx",api);await view.wait();
 const select=()=>view.node.querySelector(".asistencia-filters select");
 await view.act(async()=>Simulate.change(select(),{target:{value:"1"}}));await view.wait();
 await view.act(async()=>Simulate.change(select(),{target:{value:"2"}}));await view.wait();
 assert.equal(pending.get("1").signal.aborted,true);
 await view.act(async()=>pending.get("2").resolve(pageData("Latest")));
 await view.act(async()=>pending.get("1").resolve(pageData("Obsolete")));
 assert.ok(view.node.querySelector("tbody").textContent.includes("Latest"));assert.ok(!view.node.textContent.includes("Obsolete"));await view.close();
});
test("business date remains the local day after UTC midnight",()=>{
 const dates=load("utils/utilidadesFecha.ts");assert.equal(dates.businessDate(new Date("2026-11-01T01:30:00Z")),"2026-10-31");
});

test("service worker never caches API or cross-origin requests and precaches only initial scripts",async()=>{
 const {pwa}=load("../pwa.ts");const emitted=[];
 pwa().generateBundle.call({emitFile:item=>emitted.push(item)},null,{
  "assets/main-hash.js":{type:"chunk",isEntry:true,imports:["assets/vendor-hash.js"]},
  "assets/vendor-hash.js":{type:"chunk",isEntry:false,imports:[]},
  "assets/route-lazy.js":{type:"chunk",isEntry:false,imports:[]},"assets/style.css":{type:"asset"}
 });
 const source=emitted.find(item=>item.fileName==="sw.js").source;
 const handlers={},cacheNames=["api-cache","gestionar-static-old"],deleted=[];
 const workerCaches={open:async()=>({addAll:async list=>{
  assert.ok(list.includes('/assets/main-hash.js'));assert.ok(list.includes('/assets/vendor-hash.js'));assert.ok(!list.includes('/assets/route-lazy.js'));
 },match:async()=>new Response('<html>offline shell</html>')}),keys:async()=>cacheNames,delete:async name=>{deleted.push(name);return true;}};
 const self={location:{origin:"https://example.test"},addEventListener:(name,handler)=>{handlers[name]=handler;},skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 vm.runInNewContext(source,{self,caches:workerCaches,URL,fetch:async()=>{throw new Error('offline');},Promise,Math});
 let pending;handlers.install({waitUntil:promise=>{pending=promise;}});await pending;
 handlers.activate({waitUntil:promise=>{pending=promise;}});await pending;assert.deepEqual(deleted,cacheNames);
 for(const url of ["https://example.test/api/users/me","https://api.test/private"]){
  let intercepted=false;handlers.fetch({request:{url,method:"GET",mode:"cors"},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
 }
 handlers.fetch({request:{url:"https://example.test/panel",method:"GET",mode:"navigate"},respondWith:promise=>{pending=promise;}});
 assert.ok((await (await pending).text()).includes('offline shell'));
});

const directoryMember={id:42,name:'Academic member',email:'member@test.invalid',role:'admin',document:'12345678901234567',telefono:'555',student_id:7,grade:'Organization A',student_enrollment_date:'2020-02-29',teacher_id:null,specialty:null};
test("unified members keeps academic fields after failed edits and sends profile filters separately from roles",async()=>{
 const {Simulate}=require('react-dom/test-utils');const calls=[];let submitted;
 const api={get:async(url,config)=>{calls.push([url,config]);return {data:url==='/users/me'?{...directoryMember,id:1,student_id:null}:url==='/users/organizations'?['Organization A']:url==='/users/members'?{items:[directoryMember],total:1}:null};},put:async(url,body)=>{submitted=body;throw {response:{data:{message:'Cannot save'}}};}};
 const view=await mountPage('pages/Miembros.tsx',api);await view.wait();
 try{
  await view.act(async()=>Simulate.change(view.node.querySelector('[name="profile_filter"]'),{target:{value:'student'}}));await view.wait();
  const last=calls.filter(([url])=>url==='/users/members').at(-1);assert.equal(last[1].params.profile,'student');assert.equal(last[1].params.role,undefined);assert.equal(last[1].params.limit,10);
  await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Editar Academic member"]')));
  assert.equal(view.node.querySelector('[name="grade"]').value,'Organization A');assert.equal(view.node.querySelector('[name="student_enrollment_date"]').value,'2020-02-29');
  await view.act(async()=>Simulate.change(view.node.querySelector('[name="grade"]'),{target:{value:'Estaca'}}));
  await view.act(async()=>Simulate.submit(view.node.querySelector('form')));
  assert.equal(submitted.grade,'Estaca');assert.equal(submitted.document,directoryMember.document);assert.equal(submitted.include_student_profile,true);
  assert.equal(view.node.querySelector('[name="grade"]').value,'Estaca');assert.ok(view.node.textContent.includes('Cannot save'));
  assert.ok(!calls.some(([url])=>url==='/users'));
 }finally{await view.close();}
});

test("teacher member directory is read only and links use academic profile identity",async()=>{
 const {Simulate}=require('react-dom/test-utils');const calls=[];
 const api={get:async(url)=>{calls.push(url);return {data:url==='/users/me'?{id:2,role:'teacher'}:url==='/users/members'?{items:[{...directoryMember,role:'student',document:null}],total:1}:{member:{...directoryMember,role:'student',document:null},courses:[],summary:{courses:0,present:0,absent:0,average_grade:null}}};}};
 const view=await mountPage('pages/Miembros.tsx',api,{id:2,role:'teacher'});await view.wait();
 try{
  assert.ok(!view.node.textContent.includes('Registrar miembro'));assert.equal(view.node.querySelector('[aria-label="Editar Academic member"]'),null);
  assert.deepEqual(Array.from(view.node.querySelectorAll('thead th')).map(x=>x.textContent),['Nombre','Documento','Organización','Contacto','Rol de acceso','Acciones']);
  assert.deepEqual(Array.from(view.node.querySelectorAll('thead th:not(.table-desktop-only)')).map(x=>x.textContent),['Nombre','Documento','Acciones']);
  assert.equal(view.node.querySelectorAll('.table-record-actions button').length,1);
  const name=view.node.querySelector('[aria-label="Ver ficha de Academic member"]');name.focus();
  await view.act(async()=>Simulate.click(name));
  assert.ok(view.node.querySelector('[role="dialog"][aria-modal="true"]'));

  assert.ok(view.node.textContent.includes('Resumen de tus cursos'));
  assert.equal(view.node.querySelector('a[href^="/asistencia"]').getAttribute('href'),'/asistencia?student_id=7');
  assert.ok(!calls.includes('/users/organizations'));assert.ok(!calls.includes('/users'));
  await view.act(async()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(view.node.querySelector('[role="dialog"]'),null);assert.equal(document.activeElement,name);

 }finally{await view.close();}
});

test("student opens own member profile without loading the full directory",async()=>{
 const calls=[];const member={...directoryMember,role:'student'};
 const api={get:async(url)=>{calls.push(url);return {data:url==='/users/me'?member:{member,courses:[],summary:null}};}};
 const view=await mountPage('pages/Miembros.tsx',api,member);
 try{assert.ok(view.node.textContent.includes('Mi perfil'));assert.ok(view.node.textContent.includes('Organization A'));assert.ok(calls.includes('/users/42/academic'));assert.ok(!calls.includes('/users/members'));}finally{await view.close();}
});

for(const filename of ['ReservarViajes.tsx','PagosTemplos.tsx']){
 test(filename+': statistics automatically use the scheduled trip and exclude historical list totals',async()=>{
  const {Simulate}=require('react-dom/test-utils');const calls=[];
  const resource=filename==='ReservarViajes.tsx'?'/trip-reservations':'/temple-amortizations';
  const api={get:async(url,config)=>{
   calls.push([url,config]);
   if(url==='/temple-trips')return {data:[{id:3,date:'2999-03-01',status:'programado',temple_name:'Later'},{id:9,date:'2020-01-01',status:'finalizado',temple_name:'Historical'},{id:2,date:'2999-01-01',status:'programado',temple_name:'Next'},{id:4,date:'2999-02-01',status:'cancelado',temple_name:'Cancelled'}]};
   if(url===resource){const id=config.params.trip_id;return {data:{items:[],total:id==='2'?2:id==='3'?3:999,summary:id?{totalPaid:20,totalPending:80,totalPagado:20,totalAdeudado:80,totalSaldados:1}:{totalPaid:9999,totalPending:9999,totalPagado:9999,totalAdeudado:9999,totalSaldados:999}}};}
   return {data:[]};
  }};
  const view=await mountPage('pages/'+filename,api);await view.wait();
  try{
   assert.equal(view.node.querySelector('[aria-label="Viaje de las estadísticas"] select'),null);assert.ok(view.node.querySelector('[aria-label="Viaje de las estadísticas"]').textContent.includes('Next'));
   const figures=()=>Array.from(view.node.querySelectorAll('.asistencia-stat-content h3')).map(x=>x.textContent);
   assert.equal(figures()[0],'2');assert.equal(figures()[1],'$20');assert.equal(figures()[2],'$80');
   const statsCalls=calls.filter(([url,config])=>url===resource&&config.params.limit===1);assert.ok(statsCalls.length);assert.ok(statsCalls.every(([,config])=>config.params.trip_id==='2'));
   assert.ok(calls.some(([url,config])=>url===resource&&!config.params.trip_id&&config.params.limit===7));
  }finally{await view.close();}
 });
 test(filename+': no upcoming scheduled trip shows zero statistics despite historical totals',async()=>{
  const resource=filename==='ReservarViajes.tsx'?'/trip-reservations':'/temple-amortizations';
  const api={get:async(url)=>({data:url==='/temple-trips'?[{id:9,date:'2020-01-01',status:'finalizado'}]:url===resource?{items:[],total:999,summary:{totalPaid:999,totalPagado:999,totalPending:999,totalAdeudado:999}}:[]})};
  const view=await mountPage('pages/'+filename,api);await view.wait();
  try{const figures=Array.from(view.node.querySelectorAll('.asistencia-stat-content h3')).map(x=>x.textContent);assert.deepEqual(figures.slice(0,3),['0','$0','$0']);assert.ok(view.node.textContent.includes('No hay viajes programados próximos'));}finally{await view.close();}
 });
}


test('floating navigation opens only the selected category, closes on navigation and Escape',async()=>{
 const {Simulate}=require('react-dom/test-utils');
 const view=await mountPage('components/BarraLateral.tsx',{}, {id:1,role:'admin'},true);
 try{
  const nav=view.node.querySelector('[aria-label="Menú principal"]');
  assert.equal(nav.querySelectorAll('.floating-nav-trigger').length,5);assert.equal(nav.querySelectorAll('.floating-nav-submenu').length,0);
  const teaching=nav.querySelector('[aria-label="Enseñanza"]');
  await view.act(async()=>Simulate.click(teaching));assert.equal(teaching.getAttribute('aria-expanded'),'true');assert.ok(nav.querySelector('a[href="/asistencia"]'));
  await view.act(async()=>Simulate.click(nav.querySelector('[aria-label="Templo"]')));assert.equal(teaching.getAttribute('aria-expanded'),'false');assert.equal(nav.querySelectorAll('.floating-nav-submenu').length,1);
  await view.act(async()=>Simulate.click(nav.querySelector('a[href="/pagos"]')));assert.equal(nav.querySelectorAll('.floating-nav-submenu').length,0);
  await view.act(async()=>Simulate.click(teaching));
  await view.act(async()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(teaching.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,teaching);
  await view.act(async()=>Simulate.click(teaching));
  await view.act(async()=>document.body.dispatchEvent(new window.Event('pointerdown',{bubbles:true})));assert.equal(teaching.getAttribute('aria-expanded'),'false');
 }finally{await view.close();}
});

test('header keeps icon-only theme and logout controls in order and preserves logout behavior',async()=>{
 const {Simulate}=require('react-dom/test-utils');const posts=[];global.caches=window.caches;localStorage.setItem('theme','light');
 const view=await mountPage('components/BarraLateral.tsx',{post:async route=>{posts.push(route);}}, {id:42,role:'student'},true);
 try{
  const actions=view.node.querySelector('.app-topbar-actions');assert.equal(actions.children.length,3);assert.equal(actions.textContent,'');
  assert.equal(actions.children[0].getAttribute('aria-label'),'Activar tema oscuro');assert.equal(actions.children[1].getAttribute('aria-label'),'Notificaciones');assert.equal(actions.children[2].getAttribute('aria-label'),'Cerrar sesión');
  await view.act(async()=>Simulate.click(actions.children[0]));assert.equal(document.documentElement.getAttribute('data-theme'),'dark');
  const nav=view.node.querySelector('[aria-label="Menú principal"]');assert.ok(nav.querySelector('[aria-label="Mantenimiento"]'));
  await view.act(async()=>Simulate.click(nav.querySelector('[aria-label="Enseñanza"]')));assert.ok(nav.querySelector('a[aria-label="Mi perfil"][href="/miembros"]'));
  await view.act(async()=>Simulate.click(actions.children[2]));assert.deepEqual(posts,['/logout']);assert.equal(localStorage.getItem('token'),null);assert.equal(localStorage.getItem('user'),null);assert.equal(localStorage.getItem('theme'),'dark');
 }finally{await view.close();document.documentElement.setAttribute('data-theme','light');localStorage.setItem('theme','light');}
});

test("pagination handles long lists and keeps navigation within page boundaries",async()=>{
 const {Simulate}=require('react-dom/test-utils');const changes=[];
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
 const Pagination=loadComponent('components/Pagination.tsx',{}),node=document.createElement('div');document.body.appendChild(node);const root=createRoot(node);
 try{
  await act(async()=>root.render(React.createElement(Pagination,{currentPage:50,totalPages:100,onChange:page=>changes.push(page)})));
  assert.equal(node.querySelector('[aria-current="page"]').textContent,'50');assert.ok(node.querySelectorAll('button').length<=7);assert.ok(node.textContent.includes('…'));
  await act(async()=>Simulate.click([...node.querySelectorAll('button')].find(button=>button.textContent==='Siguiente')));assert.deepEqual(changes,[51]);
  await act(async()=>root.render(React.createElement(Pagination,{currentPage:1,totalPages:2,onChange:()=>{}})));
  assert.equal([...node.querySelectorAll('button')].find(button=>button.textContent==='Anterior').disabled,true);
 }finally{await act(async()=>root.unmount());node.remove();}
});

test("closing overlapping modals in either order always restores document scrolling",()=>{
 const {lockBodyScroll}=load('utils/scrollLock.ts');
 for(const reverse of [false,true]){
  document.body.style.overflow='auto';document.documentElement.style.overflowY='scroll';
  const first=lockBodyScroll(),second=lockBodyScroll();
  assert.equal(document.body.style.overflow,'hidden');assert.equal(document.documentElement.style.overflowY,'hidden');
  (reverse?second:first)();assert.equal(document.body.style.overflow,'hidden');
  (reverse?first:second)();assert.equal(document.body.style.overflow,'auto');assert.equal(document.documentElement.style.overflowY,'scroll');
  first();second();assert.equal(document.body.style.overflow,'auto');
 }
 document.body.style.overflow='';document.documentElement.style.overflowY='';
});

test("agendas paginate seven records and keep remaining rows reachable",async()=>{
 const {Simulate}=require('react-dom/test-utils');
 const data=Array.from({length:15},(_,index)=>({id:index+1,friend:`Amigo ${index+1}`,scheduled_at:`2026-12-${String(index+1).padStart(2,'0')}T10:00`,member_names:{}}));
 const view=await mountPage('pages/Agendas.tsx',{get:async()=>({data})},{id:42,role:'student'});
 try{
  await view.wait();assert.equal(view.node.querySelectorAll('tbody tr').length,7);
  assert.equal(view.node.querySelector('tbody tr td').textContent,'Amigo 15');
  await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Página 3"]')));
  assert.equal(view.node.querySelectorAll('tbody tr').length,1);assert.equal(view.node.querySelector('tbody tr td').textContent,'Amigo 1');
 }finally{await view.close();}
});

test("dashboard combines upcoming activities and councils over three months without exposing restricted modules",async()=>{
 const {upcomingWindow,localDateKey}=load('utils/upcomingEvents.ts');
 const now=new Date(),range=upcomingWindow(now),tomorrow=new Date(now),after=new Date(range.end+'T12:00:00');tomorrow.setDate(now.getDate()+1);after.setDate(after.getDate()+1);
 const calls=[],activities=[
  {id:'2',activity_name:'Last activity',activity_datetime:`${range.end} 19:00:00`,assigned_to_name:'Ana'},
  {id:'1',activity_name:'First activity',activity_datetime:`${range.start} 10:30:00`,assigned_to_name:null},
  {id:'3',activity_name:'Past activity',activity_datetime:'2000-01-01 12:00:00'},
  {id:'4',activity_name:'Outside activity',activity_datetime:`${localDateKey(after)} 12:00:00`},
 ],meetings=[{id:1,title:'Council',meeting_date:localDateKey(tomorrow),start_time:'18:00:00',created_by_name:'María',status:'scheduled'}];
 const api={get:async url=>{calls.push(url);return {data:url==='/activities'?activities:meetings};}};
 const view=await mountPage('pages/Panel.tsx',api,{id:1,role:'admin'});
 try{await view.wait();assert.deepEqual(calls,['/activities','/meetings']);assert.deepEqual([...view.node.querySelectorAll('.monthly-activity-card h3')].map(node=>node.textContent),['First activity','Council','Last activity']);assert.ok(view.node.textContent.includes('10:30'));assert.ok(view.node.textContent.includes('María'));assert.ok(view.node.textContent.includes('Sin asignar'));assert.ok(!view.node.textContent.includes('Outside activity'));assert.equal(view.node.querySelector('.stat-card'),null);assert.equal(view.node.querySelectorAll('.shortcut-card').length,4);assert.ok(view.node.querySelector('.shortcut-card[href="/actividades"]'));assert.equal(view.node.querySelector('.shortcut-card[href="/sincronizacion"]'),null);}finally{await view.close();}
 const deniedCalls=[];
 const denied=await mountPage('pages/Panel.tsx',{get:async url=>{deniedCalls.push(url);return {data:[]};}},{id:2,role:'teacher',permissions:['panel']});
 try{await denied.wait();assert.deepEqual(deniedCalls,['/dashboard-cards']);assert.equal(denied.node.querySelector('.monthly-activity-card'),null);}finally{await denied.close();}
 const scopedCalls=[];
 const scoped=await mountPage('pages/Panel.tsx',{get:async url=>{scopedCalls.push(url);return {data:meetings};}},{id:2,role:'teacher',permissions:['panel','consejos']});
 try{await scoped.wait();assert.deepEqual(scopedCalls,['/dashboard-cards','/meetings']);assert.equal(scoped.node.querySelector('.monthly-activity-card h3').textContent,'Council');}finally{await scoped.close();}
 const partial=await mountPage('pages/Panel.tsx',{get:async url=>{if(url==='/activities')throw Error('offline');return {data:meetings};}},{id:1,role:'admin'});
 try{await partial.wait();assert.equal(partial.node.querySelector('.monthly-activity-card h3').textContent,'Council');assert.ok(partial.node.querySelector('[role="alert"]'));}finally{await partial.close();}
});

test("three-month windows clamp month endings, cross the year and include both boundary dates",()=>{
 const {upcomingWindow,upcomingEvents}=load('utils/upcomingEvents.ts');
 assert.equal(upcomingWindow(new Date(2027,0,31)).end,'2027-04-30');
 assert.equal(upcomingWindow(new Date(2027,10,30)).end,'2028-02-29');
 const result=upcomingEvents([
  {id:'1',activity_name:'Start',activity_datetime:'2026-11-20T09:00'},
  {id:'2',activity_name:'End',activity_datetime:'2027-02-20T23:59'},
  {id:'3',activity_name:'Outside',activity_datetime:'2027-02-21T00:00'},
 ],[],{start:'2026-11-20',end:'2027-02-20'});
 assert.deepEqual(Array.from(result,item=>item.title),['Start','End']);
});

test("calendar periods omit the year visually and preserve weekly navigation",async()=>{
 const {shortWeekRange}=load('utils/calendarPeriod.ts');
 assert.equal(shortWeekRange(new Date(2026,10,23),new Date(2026,10,29)),'23 a 29 nov.');
 assert.equal(shortWeekRange(new Date(2026,10,30),new Date(2026,11,6)),'30 nov. a 6 dic.');
 assert.equal(shortWeekRange(new Date(2026,11,28),new Date(2027,0,3)),'28 dic. a 3 ene.');
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),{MemoryRouter}=require('react-router-dom'),{Simulate}=require('react-dom/test-utils');
 const previous=window.matchMedia;window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 const Calendar=loadComponent('components/activities/CalendarioActividades.tsx',{}),node=document.createElement('div');document.body.appendChild(node);const root=createRoot(node),changes=[];
 try{
  await act(async()=>root.render(React.createElement(MemoryRouter,null,React.createElement(Calendar,{month:'2026-11',week:'2026-11-23',activities:[],canAdd:false,onPeriod:(...args)=>changes.push(args),onSelect(){}}))));
  const period=node.querySelector('.activity-calendar-period');assert.equal(period.textContent,'23 a 29 nov.');assert.ok(period.getAttribute('aria-label').includes('2026'));
  await act(async()=>Simulate.click(node.querySelector('[aria-label="Semana siguiente"]')));assert.deepEqual(changes,[['2026-11-30',true]]);
 }finally{await act(async()=>root.unmount());node.remove();window.matchMedia=previous;}
});

test("desktop dashboard cards open activity and council details without leaving the panel",async()=>{
 const {Simulate}=require('react-dom/test-utils');const previous=window.matchMedia;
 window.matchMedia=query=>({matches:query==='(min-width: 701px)',addEventListener(){},removeEventListener(){}});
 const date=new Date(),day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const api={get:async url=>({data:url==='/activities'?[{id:1,activity_name:'Servicio',activity_datetime:day+'T18:00',description:'Detalle completo de actividad',purpose:'Ayudar',assigned_to_name:'Ana',attendance:0,budget:0}]:[{id:1,title:'Consejo de barrio',meeting_date:day,start_time:'19:00',end_time:'20:00',created_by_name:'Luis',topics:'Planificación',notes:'Observaciones del consejo',attendees:[{id:2,name:'María',status:'confirmed'}]}]})};
 const view=await mountPage('pages/Panel.tsx',api,{id:1,role:'admin'});
 try{
  await view.wait();const card=view.node.querySelector('[aria-label="Ver detalles de Servicio"]');card.focus();
  await view.act(async()=>Simulate.click(card));
  let modal=view.node.querySelector('[role="dialog"]');assert.ok(modal.textContent.includes('Detalle completo de actividad'));assert.ok(modal.textContent.includes('0 hermanos'));
  await view.act(async()=>Simulate.click(view.node.querySelector('.form-modal-overlay')));assert.equal(view.node.querySelector('[role="dialog"]'),null);assert.equal(document.activeElement,card);
  await view.act(async()=>Simulate.keyDown(view.node.querySelector('[aria-label="Ver detalles de Consejo de barrio"]'),{key:'Enter'}));
  modal=view.node.querySelector('[role="dialog"]');assert.ok(modal.textContent.includes('Planificación'));assert.ok(modal.textContent.includes('Observaciones del consejo'));assert.ok(modal.textContent.includes('María · Confirmado'));
 }finally{await view.close();window.matchMedia=previous;}
});

test("appearance exposes exactly twelve colors and keeps Android's palette until explicitly disabled",async()=>{
 const {Simulate}=require('react-dom/test-utils');localStorage.removeItem('appearance');document.documentElement.classList.add('native-android');
 const view=await mountPage('components/AppearanceSettings.tsx',{}, {id:1,role:'admin'},true);
 try{
  await view.wait();assert.equal(view.node.querySelectorAll('.appearance-swatch').length,36);assert.ok(document.documentElement.style.getPropertyValue('--primary').includes('--android-primary'));
  assert.ok([...view.node.querySelectorAll('.appearance-colors')].every(fieldset=>fieldset.disabled));
  await view.act(async()=>Simulate.change(view.node.querySelector('.appearance-device input'),{target:{checked:false}}));
  await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Botones: Verde"]')));
  assert.equal(JSON.parse(localStorage.getItem('appearance')).buttonColor,10);
  assert.ok(!document.documentElement.style.getPropertyValue('--primary').includes('--android-primary'));
  await view.act(async()=>Simulate.change([...view.node.querySelectorAll('select')][1],{target:{value:'serif'}}));
  assert.ok(document.documentElement.style.getPropertyValue('--app-font').includes('Georgia'));
 }finally{await view.close();document.documentElement.classList.remove('native-android');localStorage.removeItem('appearance');}
});

test("appearance colors maintain readable button labels in both modes and reject invalid saved choices",()=>{
 const {ACCENT_COLORS,readAppearance,swatchTextColor}=load('shared/appearance.ts');
 const luminance=hex=>{const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 assert.equal(ACCENT_COLORS.length,12);
 assert.deepEqual(Array.from(ACCENT_COLORS,color=>color.name),['Azul','Azul violeta','Violeta','Rojo violeta','Rojo','Rojo naranja','Naranja','Amarillo naranja','Amarillo','Amarillo verde','Verde','Azul verde']);
 for(const color of ACCENT_COLORS){assert.ok(ratio(color.light,'#FFFFFF')>=4.5,color.name+' light');assert.ok(ratio(color.dark,'#111111')>=4.5,color.name+' dark');assert.ok(ratio(color.color,swatchTextColor(color.color))>=4.5,color.name+' swatch');}
 localStorage.setItem('appearance',JSON.stringify({buttonColor:99,iconColor:-4,fontColor:14,font:'invalid',textSize:'invalid'}));
 const config=readAppearance();assert.equal(config.buttonColor,0);assert.equal(config.iconColor,0);assert.equal(config.fontColor,-1);assert.equal(config.font,'system');localStorage.removeItem('appearance');
 localStorage.setItem('appearance',JSON.stringify({buttonColor:8}));assert.equal(readAppearance().buttonColor,10);
 localStorage.setItem('appearance',JSON.stringify({buttonColor:10,paletteVersion:2}));assert.equal(readAppearance().buttonColor,10);localStorage.removeItem('appearance');
});

test("activity areas use consistent chips with full names instead of mixed status styling",async()=>{
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
 const Areas=loadComponent('components/activities/ActivityAreas.tsx',{}),node=document.createElement('div');document.body.appendChild(node);const root=createRoot(node);
 try{
  await act(async()=>root.render(React.createElement(Areas,{activity:{spiritual:true,social:true,physical:true,intellectual:true}})));
  assert.deepEqual([...node.querySelectorAll('.activity-area-chip')].map(item=>item.textContent),['Espiritual','Social','Físico','Intelectual']);assert.equal(node.querySelector('.status-badge'),null);
  await act(async()=>root.render(React.createElement(Areas,{activity:{spiritual:false,social:false,physical:false,intellectual:false}})));assert.equal(node.textContent,'—');
 }finally{await act(async()=>root.unmount());node.remove();}
});

test("an expired token keeps the previously authenticated local session available",()=>{
 const React=require("react");
 const PrivateRoute=loadComponent("components/RutaPrivada.tsx",{});
 const token="header."+Buffer.from(JSON.stringify({exp:1})).toString("base64url")+".signature";
 localStorage.setItem("token",token);
 localStorage.setItem("user",JSON.stringify({id:42,role:"student"}));
 const protectedPage=React.createElement("p",null,"Datos locales");
 assert.equal(PrivateRoute({children:protectedPage}),protectedPage);
 assert.equal(localStorage.getItem("token"),token);
 localStorage.removeItem("user");
 assert.equal(PrivateRoute({children:protectedPage}).props.to,"/iniciar-sesion");
 localStorage.removeItem("token");
});

test("notification bell opens reminders and persists reading through the API",async()=>{
 const {Simulate}=require('react-dom/test-utils');const posts=[];
 const notice={id:'activity:9:2026-11-27',title:'Próxima actividad',message:'Servicio comunitario',date:'2026-11-27 18:00:00',href:'/actividades',read:false};
 const api={get:async()=>({data:[notice]}),post:async(url,body)=>{posts.push([url,body]);return {data:{ok:true}};}};
 const view=await mountPage('components/NotificationBell.tsx',api,{id:1,role:'admin'});
 try {
  await view.wait();assert.equal(view.node.querySelector('.notification-count').textContent,'1');
  await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Notificaciones: 1 sin leer"]')));
  assert.ok(view.node.querySelector('[role="dialog"]'));assert.ok(view.node.textContent.includes('Servicio comunitario'));
  assert.equal(view.node.querySelector('.notification-list a').getAttribute('href'),'/actividades');
  await view.act(async()=>Simulate.click([...view.node.querySelectorAll('button')].find(button=>button.textContent==='Marcar leídas')));
  assert.deepEqual(posts,[['/notifications/read',{ids:[notice.id]}]]);
  assert.equal(view.node.querySelector('.notification-count'),null);
  await view.act(async()=>Simulate.click(view.node.querySelector('.form-modal-header [aria-label="Cerrar formulario"]')));
  assert.equal(view.node.querySelector('[role="dialog"]'),null);
 } finally {await view.close();}
});

test("notification settings keep the form in a modal and persist days and weekly time",async()=>{
 const {Simulate}=require('react-dom/test-utils');const writes=[];
 const config={activity_days:7,meeting_days:3,attendance_day:6,attendance_time:'19:00:00',time_zone:'America/Argentina/Buenos_Aires',activities_enabled:true,meetings_enabled:true,attendance_enabled:true};
 const api={get:async()=>({data:config}),put:async(url,body)=>{writes.push([url,body]);return {data:body};}};
 const view=await mountPage('pages/Notificaciones.tsx',api,{id:1,role:'admin'});
 try {
  await view.wait();assert.equal(view.node.querySelector('form'),null);
  await view.act(async()=>Simulate.click([...view.node.querySelectorAll('button')].find(button=>button.textContent==='Configurar')));
  const modal=view.node.querySelector('[role="dialog"]');assert.ok(modal);
  await view.act(async()=>Simulate.change(modal.querySelector('input[type="number"]'),{target:{value:'10'}}));
  await view.act(async()=>Simulate.change(modal.querySelector('input[type="time"]'),{target:{value:'20:30'}}));
  const zones=modal.querySelector('select[name="time_zone"]')||[...modal.querySelectorAll('select')].find(select=>select.value===config.time_zone);
  assert.ok(zones);assert.ok(zones.options.length>20);
  await view.act(async()=>Simulate.change(zones,{target:{value:'Europe/Madrid'}}));
  await view.act(async()=>Simulate.submit(modal.querySelector('form')));
  assert.equal(writes[0][0],'/notifications/settings');assert.equal(writes[0][1].activity_days,10);assert.equal(writes[0][1].attendance_time,'20:30');
  assert.equal(writes[0][1].time_zone,'Europe/Madrid');
  assert.equal(view.node.querySelector('[role="dialog"]'),null);
  assert.ok(view.node.textContent.includes('Configuración guardada.'));
 } finally {await view.close();}
});

test("settings combines four sections with inline appearance and preserves restricted controls",async()=>{
 const {Simulate}=require('react-dom/test-utils'),calls=[];
 const config={activity_days:7,meeting_days:3,attendance_day:6,attendance_time:'19:00:00',time_zone:'America/Argentina/Buenos_Aires',activities_enabled:true,meetings_enabled:true,attendance_enabled:true};
 const view=await mountPage('pages/Ajustes.tsx',{get:async url=>{calls.push(url);return {data:config};}},{id:1,role:'admin'},true);
 try{
  await view.wait();assert.equal(view.node.querySelectorAll('h1').length,1);assert.equal(view.node.querySelector('h1').textContent,'Ajustes');
  for(const id of ['sincronizacion','notificaciones','apariencia','acerca-de'])assert.ok(view.node.querySelector('#'+id));
  assert.ok(view.node.querySelector('#sincronizacion button'));assert.equal(view.node.querySelectorAll('#apariencia .appearance-swatch').length,36);assert.equal(view.node.querySelector('[role="dialog"]'),null);
  assert.deepEqual(calls,['/notifications/settings']);
  await view.act(async()=>Simulate.change(view.node.querySelector('#apariencia select'),{target:{value:'dark'}}));assert.equal(document.documentElement.getAttribute('data-theme'),'dark');
 }finally{await view.close();localStorage.removeItem('appearance');localStorage.setItem('theme','light');}
 const deniedCalls=[];
 const restricted=await mountPage('pages/Ajustes.tsx',{get:async url=>{deniedCalls.push(url);return {data:{}};}},{id:2,role:'teacher',permissions:['panel']},true);
 try{await restricted.wait();assert.deepEqual(deniedCalls,[]);assert.equal(restricted.node.querySelector('#sincronizacion button'),null);assert.equal(restricted.node.querySelector('#notificaciones button'),null);assert.ok(restricted.node.querySelector('#apariencia select'));}finally{await restricted.close();}
});

test("every mobile submenu shows the backdrop until it closes", async () => {
 const {Simulate}=require("react-dom/test-utils");
 const previous=window.matchMedia;
 window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 const view=await mountPage("components/BarraLateral.tsx",{}, {id:1,role:"admin"},true);
 try {
  assert.equal(view.node.querySelector(".floating-nav-backdrop"),null);
  for(const category of ["Enseñanza","Liderazgo","Templo","Mantenimiento"]){
   const trigger=view.node.querySelector(`.floating-nav-trigger[aria-label="${category}"]`);
   await view.act(async()=>Simulate.click(trigger));
   const submenu = view.node.querySelector(".floating-nav-submenu");
   assert.ok([...submenu.querySelectorAll("li small")].every(description => description.textContent.trim()));
   if (category === "Enseñanza") {
    assert.deepEqual([...submenu.querySelectorAll("a")].map(link => link.getAttribute("aria-label")),
      ["Matrículas", "Asistencia", "Calificaciones"]);
   }
   if (category === "Mantenimiento") {assert.ok(submenu.querySelector('a[href="/maestros"]'));assert.equal(submenu.querySelector('a[href="/sincronizacion"]'),null);}

   const backdrop=view.node.querySelector(".floating-nav-backdrop");
   assert.equal(backdrop?.getAttribute("aria-label"),`Cerrar el menú ${category}`);
   await view.act(async()=>Simulate.click(backdrop));
   assert.equal(view.node.querySelector(".floating-nav-backdrop"),null);
  }
 } finally {
  await view.close();
  window.matchMedia=previous;
 }
});

test("leader navigation and direct access use the same page permissions", async () => {
 const { Simulate } = require("react-dom/test-utils");
 const leader = { id: 2, role: "teacher", permissions: ["agendas"] };
 const previous = window.matchMedia;
 for (const mobile of [false, true]) {
  window.matchMedia = () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} });
  const view = await mountPage("components/BarraLateral.tsx", {}, leader, true);
  try {
   assert.equal(view.node.querySelector('[aria-label="Enseñanza"]'), null);
   if (mobile) {
    assert.equal(view.node.querySelector(".desktop-sidebar"), null);
    await view.act(async () => Simulate.click(view.node.querySelector('.floating-nav [aria-label="Liderazgo"]')));
    assert.deepEqual([...view.node.querySelectorAll(".floating-nav-submenu a")].map(link => link.getAttribute("href")), ["/agendas"]);
   } else {
    assert.deepEqual([...view.node.querySelectorAll(".desktop-sidebar-pages a")].map(link => link.getAttribute("href")), ["/agendas","/ajustes"]);
    const sidebar = view.node.querySelector(".desktop-sidebar");
    const wasCollapsed = sidebar.classList.contains("is-collapsed");
    await view.act(async () => Simulate.click(sidebar.querySelector(".sidebar-collapse")));
    assert.equal(sidebar.classList.contains("is-collapsed"), !wasCollapsed);
    assert.equal(localStorage.getItem("sidebar-collapsed"), String(!wasCollapsed));
   }
   const PrivateRoute = loadComponent("components/RutaPrivada.tsx", {});
   const child = require("react").createElement("p", null, "Agendas");
   assert.equal(PrivateRoute({ module: "agendas", children: child }), child);
   assert.equal(PrivateRoute({ module: "actividades", children: child }).props.to, "/agendas");
  } finally {
   await view.close();
   window.matchMedia = previous;
  }
 }
});

test("desktop navigation puts teachers in maintenance and groups settings last",async()=>{
 const {Simulate}=require('react-dom/test-utils');const previous=window.matchMedia;window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const view=await mountPage('components/BarraLateral.tsx',{}, {id:1,role:'admin'},true);
 try{
  const nav=view.node.querySelector('.desktop-sidebar-pages'),sections=[...nav.querySelectorAll('section')];
  assert.equal(nav.lastElementChild.getAttribute('aria-label'),'Ajustes');
  assert.equal(nav.querySelector('[aria-label="Enseñanza"] a[href="/maestros"]'),null);
  assert.ok(nav.querySelector('[aria-label="Mantenimiento"] a[href="/maestros"]'));
  const settings=nav.querySelector('[aria-label="Ajustes"]');
  assert.equal(settings.getAttribute('href'),'/ajustes');assert.equal(settings.tagName,'A');
  assert.equal(nav.querySelector('a[href="/sincronizacion"]'),null);assert.equal(nav.querySelector('a[href="/notificaciones"]'),null);
 }finally{await view.close();window.matchMedia=previous;}
});

test("admin can assign financial pages and finance members can create/edit without privileged controls",async()=>{
 const {Simulate}=require('react-dom/test-utils');
 const admin={id:1,name:'Admin',role:'admin',permissions:[]};
 const editor=await mountPage('pages/Miembros.tsx',{get:async url=>({data:url==='/users/me'?admin:{items:[],total:0}})},admin);
 try{
  await editor.wait();await editor.act(async()=>Simulate.click(editor.node.querySelector('[aria-label="Agregar miembro"]')));
  await editor.act(async()=>Simulate.change(editor.node.querySelector('[name="role"]'),{target:{value:'finance'}}));
  const fieldset=editor.node.querySelector('.leader-permissions');assert.ok(fieldset.textContent.includes('Páginas del Financiero'));assert.ok(fieldset.textContent.includes('Pagos'));assert.ok(!fieldset.textContent.includes('Asistencia'));
 }finally{await editor.close();}
 const finance={id:9,name:'Financiero',role:'finance',permissions:['miembros']};
 const member={...directoryMember,role:'student'},privileged={...directoryMember,id:1,name:'Admin',role:'admin'};
 const view=await mountPage('pages/Miembros.tsx',{get:async url=>({data:url==='/users/me'?finance:{items:[member,privileged],total:2}})},finance);
 try{
  await view.wait();assert.ok(view.node.querySelector('[aria-label="Agregar miembro"]'));assert.ok(view.node.querySelector('[aria-label="Editar Academic member"]'));assert.equal(view.node.querySelector('[aria-label="Editar Admin"]'),null);assert.equal(view.node.querySelector('[title="Eliminar"]'),null);
  await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Editar Academic member"]')));
  assert.equal(view.node.querySelector('[name="role"]'),null);assert.equal(view.node.querySelector('[name="password"]'),null);assert.equal(view.node.querySelector('.leader-permissions'),null);
 }finally{await view.close();}
});

test("finance authorization requires each selected page and rejects forged academic permissions",()=>{
 const constants=load('shared/constants.ts');
 const {canAccessModule,canManageModule}=load('utils/access.ts',{}, {'../shared/constants':constants});
 const user={role:'finance',permissions:['miembros','pagos-templos','asistencia']};
 assert.equal(canManageModule(user,'miembros'),true);assert.equal(canManageModule(user,'pagos-templos'),true);
 assert.equal(canManageModule(user,'reservar-viajes'),false);assert.equal(canAccessModule(user,'asistencia'),false);
});

test("grade details and permitted mutations are in the Actions column", async () => {
 const { Simulate } = require("react-dom/test-utils");
 const grade = { id: 9, student_id: 7, student_name: "Ana", course_title: "Curso", grade: 85,
  grade_type: "examen", created_at: "2026-11-15" };
 const api = { get: async url => ({ data: url === "/grades" ? { items: [grade], total: 1 } : [] }) };
 for (const role of ["admin", "student"]) {
  const view = await mountPage("pages/Calificaciones.tsx", api, { id: 7, role });
  try {
   await view.wait();
   const row = view.node.querySelector("tbody tr");
   const headers = view.node.querySelectorAll("thead th");
   const eye = row.querySelector('[aria-label="Ver calificación"]');
   assert.ok(eye);
   assert.equal(headers[eye.closest("td").cellIndex].textContent, "Acciones");
   assert.equal(eye.closest("td").querySelectorAll("button").length, role === "admin" ? 3 : 1);
   await view.act(async () => Simulate.click(eye));
   assert.match(view.node.querySelector('[role="dialog"]').textContent, /85/);
  } finally {
   await view.close();
  }
 }
});

test('mobile action menu opens details and preserves role-specific edit/delete controls',async()=>{
 const {Simulate}=require('react-dom/test-utils'),previous=window.matchMedia;
 window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 const grade={id:9,student_id:7,student_name:'Ana',course_title:'Curso',grade:85,grade_type:'examen',created_at:'2026-11-15'};
 const api={get:async url=>({data:url==='/grades'?{items:[grade],total:1}:[]})};
 try{for(const role of ['admin','student']){
  const view=await mountPage('pages/Calificaciones.tsx',api,{id:7,role});
  try{
   await view.wait();const row=view.node.querySelector('tbody tr');
   assert.equal(row.querySelectorAll('button').length,1);
   const trigger=row.querySelector('[aria-label="Acciones del registro"]');assert.ok(trigger);
   await view.act(async()=>Simulate.click(trigger));
   const menu=document.querySelector('.record-actions-menu');assert.ok(menu);
   assert.deepEqual([...menu.querySelectorAll('span')].map(el=>el.textContent),role==='admin'?['Ver','Editar','Eliminar']:['Ver']);
   await view.act(async()=>Simulate.click(menu.querySelector('button')));
   assert.equal(document.querySelector('.record-actions-menu'),null);
   assert.match(view.node.querySelector('[role="dialog"]').textContent,/85/);
  }finally{await view.close();}
 }}finally{window.matchMedia=previous;}
});

test('Android reminder scheduling deduplicates, reschedules changes and clears account data',async()=>{
 let pending=[],scheduled=[],cancelled=[],permission='granted',deliveredCleared=0;
 const native=load('native/androidNotifications.ts',{}, {
  '@capacitor/core':{Capacitor:{getPlatform:()=> 'android'}},
  '@capacitor/local-notifications':{LocalNotifications:{
   checkPermissions:async()=>({display:permission}),requestPermissions:async()=>({display:permission}),createChannel:async()=>{},
   getPending:async()=>({notifications:pending}),
   schedule:async({notifications})=>{scheduled.push(...notifications);for(const n of notifications)pending=[...pending.filter(p=>p.id!==n.id),n];},
   cancel:async({notifications})=>{cancelled.push(...notifications);pending=pending.filter(p=>!notifications.some(n=>n.id===p.id));},
   removeAllDeliveredNotifications:async()=>{deliveredCleared++;}
  }}
 });
 localStorage.setItem('user',JSON.stringify({id:42}));localStorage.removeItem('android-reminder-plan');
 try{
  assert.equal(await native.enableAndroidNotifications(),true);
  const plan=[{key:'activity:1:date',title:'Actividad',body:'Servicio',href:'/actividades',at:new Date(Date.now()+86400000).toISOString()}];
  await native.synchronizeAndroidReminders('42',plan);assert.equal(scheduled.length,1);assert.ok(scheduled[0].id>0);
  assert.equal(scheduled[0].extra.userId,'42');assert.equal(scheduled[0].smallIcon,'ic_notification');
  await native.synchronizeAndroidReminders('42',plan);assert.equal(scheduled.length,1);
  plan[0].at=new Date(Date.now()+172800000).toISOString();await native.synchronizeAndroidReminders('42',plan);assert.equal(scheduled.length,2);
  await native.synchronizeAndroidReminders('43',plan);assert.equal(scheduled.length,2);
  await native.synchronizeAndroidReminders('42',[]);assert.equal(pending.length,0);assert.ok(cancelled.length);
  permission='denied';await native.synchronizeAndroidReminders('42',plan);assert.equal(scheduled.length,2);
  await native.clearAndroidReminders();assert.equal(localStorage.getItem('android-reminder-plan'),null);assert.equal(deliveredCleared,1);
 }finally{localStorage.removeItem('android-reminders-enabled');localStorage.removeItem('android-reminder-plan');}
});

test('appearance modal closes from its header and restores scrolling on mobile',async()=>{
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),{Simulate}=require('react-dom/test-utils');
 global.IS_REACT_ACT_ENVIRONMENT=true;global.getComputedStyle=window.getComputedStyle.bind(window);
 const previous=window.matchMedia;window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 const Appearance=loadComponent('components/AppearanceSettings.tsx',{},true),node=document.createElement('div');document.body.appendChild(node);const root=createRoot(node);
 function Host(){const [open,setOpen]=React.useState(true);return open?React.createElement(Appearance,{onClose:()=>setOpen(false)}):React.createElement('p',null,'Cerrado');}
 try{await act(async()=>root.render(React.createElement(Host)));
  const close=node.querySelector('.form-modal-header [aria-label="Cerrar formulario"]');assert.ok(close);assert.equal(node.querySelectorAll('.modal-close-control').length,1);assert.equal(node.querySelector('.appearance-footer .modal-mobile-close-button'),null);assert.equal(close.querySelector('.modal-close-mobile').textContent,'Cerrar');
  await act(async()=>Simulate.click(close));assert.equal(node.querySelector('[role="dialog"]'),null);assert.equal(document.body.style.overflow,'');
 }finally{await act(async()=>root.unmount());node.remove();window.matchMedia=previous;}
});


test('dashboard carousel shows role-specific temple trip and own courses on mobile and desktop',async()=>{
 const previous=window.matchMedia;
 try{for(const mobile of [false,true])for(const role of ['finance','teacher','student']){
  window.matchMedia=()=>({matches:!mobile,addEventListener(){},removeEventListener(){}});
  const cards=role==='finance'?{trip:{id:1,temple_name:'Templo próximo',date:'2999-12-01',cost:100,status:'programado'},courses:[]}:{trip:null,courses:[{id:1,title:role==='teacher'?'Curso que enseño':'Curso inscrito propio',teacher_name:'Maestro propio',description:'Descripción del curso'}]};
  const calls=[];
  const view=await mountPage('pages/Panel.tsx',{get:async url=>{calls.push(url);return {data:url==='/dashboard-cards'?cards:[]};}},{id:42,role,permissions:['panel','reservar-viajes']});
  try{await view.wait();assert.ok(calls.includes('/dashboard-cards'));
   const card=view.node.querySelector(role==='finance'?'.dashboard-trip-card':'.dashboard-course-card');assert.ok(card);
   assert.match(card.textContent,role==='finance'?/Templo próximo/:role==='teacher'?/Curso que enseño/:/Curso inscrito propio/);
   if(role==='finance')assert.match(card.textContent,/Programado/);else assert.match(card.textContent,/Maestro propio/);
  }finally{await view.close();}
 }}finally{window.matchMedia=previous;}
});


test('speech search filters references and selects one into a speaker assignment on web and mobile',async()=>{
 const {Simulate}=require('react-dom/test-utils'),previous=window.matchMedia;
 const references=[{id:1,title:'Discurso de fe',author:'Autor',conference:'Abril de 2023',url:'https://www.churchofjesuschrist.org/study/general-conference/2023/04/47nelson?lang=spa',topics:['Fe']},{id:2,title:'Paz y caridad',author:'Otro autor',conference:'Octubre de 2023',url:'https://www.churchofjesuschrist.org/study/general-conference/2023/10/51nelson?lang=spa',topics:['Paz']}];
 try{for(const mobile of [false,true]){
  window.matchMedia=()=>({matches:mobile,addEventListener(){},removeEventListener(){}});const writes=[];
  const api={get:async url=>({data:url==='/speakers/members'?[{id:42,name:'Ana'}]:url==='/temas'?[{id:1,title:'Fe'}]:url==='/speakers/catalog'?references:[]}),post:async(url,body)=>{writes.push([url,body]);return {data:{...body,id:9}};}};
  const view=await mountPage('pages/Discursantes.tsx',api);
  try{
   await view.wait();await view.act(async()=>Simulate.click(view.node.querySelector('.speakers-header [aria-label="Buscar discurso"]')));await view.wait();
   const dialog=document.querySelector('[role="dialog"]');assert.ok(dialog);assert.equal(dialog.querySelectorAll('.speech-search-results li').length,2);
   await view.act(async()=>Simulate.change(dialog.querySelector('select'),{target:{value:'Fe'}}));assert.equal(dialog.querySelectorAll('.speech-search-results li').length,1);
   await view.act(async()=>Simulate.change(dialog.querySelector('input[type="search"]'),{target:{value:'FÉ'}}));assert.equal(dialog.querySelectorAll('.speech-search-results li').length,1);
   await view.act(async()=>Simulate.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Seleccionar')));
   assert.equal(document.querySelector('.speech-search-results'),null);const form=view.node.querySelector('form');assert.ok(form);
   await view.act(async()=>Simulate.change(form.querySelector('select'),{target:{value:'42'}}));
   assert.equal(form.querySelector('input[type="text"]').value,'Discurso de fe');assert.ok(form.textContent.includes('Abril de 2023'));
   await view.act(async()=>Simulate.submit(form));assert.equal(writes[0][0],'/speakers');assert.equal(writes[0][1].speech_reference_id,'1');assert.equal(writes[0][1].tema_id,'1');
  }finally{await view.close();}
 }}finally{window.matchMedia=previous;}
});

test('speech catalog opens a separate reference form and preserves errors and read-only access',async()=>{
 const {Simulate}=require('react-dom/test-utils');let writes=[];
 const api={get:async url=>({data:[]}),post:async(url,body)=>{writes.push([url,body]);throw {response:{data:{message:'Enlace no válido'}}};}};
 const view=await mountPage('pages/Discursantes.tsx',api);
 try{await view.wait();await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Buscar discurso"]')));await view.wait();
  await view.act(async()=>Simulate.click([...document.querySelectorAll('button')].find(b=>b.textContent==='Referencia')));
  const form=document.querySelector('.speech-reference-form');assert.ok(form);assert.equal(form.querySelectorAll('input').length,5);
  const values=['Título','Autor','Abril de 2024','https://example.test','Fe, Servicio'];
  for(const [index,input] of [...form.querySelectorAll('input')].entries())await view.act(async()=>Simulate.change(input,{target:{value:values[index]}}));
  await view.act(async()=>Simulate.submit(form));assert.deepEqual(writes[0][1].topics,['Fe','Servicio']);assert.equal(form.querySelector('input').value,'Título');assert.match(document.querySelector('[role="alert"]').textContent,/Enlace no válido/);
 }finally{await view.close();}
 const readOnly=await mountPage('pages/Discursantes.tsx',api,{id:2,role:'teacher',permissions:['discursantes']});
 try{await readOnly.wait();await readOnly.act(async()=>Simulate.click(readOnly.node.querySelector('[aria-label="Buscar discurso"]')));await readOnly.wait();assert.ok(document.querySelector('[role="dialog"]'));assert.equal(document.querySelector('.speech-reference-form'),null);assert.ok(![...document.querySelectorAll('button')].some(b=>b.textContent==='Referencia'));}finally{await readOnly.close();}
});


test('online speech search paginates and imports the selected reference on web and mobile',async()=>{
 const {Simulate}=require('react-dom/test-utils'),previous=window.matchMedia;
 const reference={id:91,title:'Felicidad y paz',author:'Autor de prueba',conference:'Octubre de 2023',url:'https://www.churchofjesuschrist.org/study/general-conference/2023/10/31sabin?lang=spa',topics:['felicidad']};
 try{for(const mobile of [false,true]){
  window.matchMedia=()=>({matches:mobile,addEventListener(){},removeEventListener(){}});const calls=[],writes=[];
  const api={get:async(url,config)=>{calls.push([url,config]);return {data:url==='/speakers/search-online'?{items:[{...reference,snippet:'Texto <img src=x onerror=alert(1)>'}],page:config.params.page,hasNext:config.params.page===1}:[]};},post:async(url,body)=>{writes.push([url,body]);if(mobile)throw {response:{status:409,data:{reference}}};return {data:reference};}};
  const view=await mountPage('pages/Discursantes.tsx',api);
  try{await view.wait();await view.act(async()=>Simulate.click(view.node.querySelector('.speakers-header [aria-label="Buscar discurso"]')));await view.wait();
   let dialog=document.querySelector('[role="dialog"]');await view.act(async()=>Simulate.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='En línea')));
   await view.act(async()=>Simulate.change(dialog.querySelector('input[type="search"]'),{target:{value:'felicidad'}}));
   await view.act(async()=>Simulate.submit(dialog.querySelector('form')));
   assert.match(dialog.textContent,/Felicidad y paz/);assert.equal(dialog.querySelector('img'),null);assert.match(dialog.querySelector('a').href,/query=felicidad/);
   await view.act(async()=>Simulate.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Siguiente')));
   assert.equal(calls.filter(([url])=>url==='/speakers/search-online')[1][1].params.page,2);assert.match(dialog.textContent,/Página 2/);
   await view.act(async()=>Simulate.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Seleccionar')));
   assert.equal(writes[0][0],'/speakers/catalog');assert.equal(writes[0][1].url,reference.url);
   assert.equal(view.node.querySelector('form input[type="text"]').value,reference.title);assert.match(view.node.querySelector('.speech-reference-preview').textContent,/Autor de prueba/);
  }finally{await view.close();}
 }}finally{window.matchMedia=previous;}
});

test('online speech errors keep an official-site fallback and preserve catalog browsing',async()=>{
 const {Simulate}=require('react-dom/test-utils');
 const api={get:async(url)=>{if(url==='/speakers/search-online')throw {response:{data:{message:'Buscador temporalmente no disponible'}}};return {data:[]};}};
 const view=await mountPage('pages/Discursantes.tsx',api,{id:2,role:'teacher',permissions:['discursantes']});
 try{await view.wait();await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Buscar discurso"]')));await view.wait();
  const dialog=document.querySelector('[role="dialog"]');await view.act(async()=>Simulate.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='En línea')));
  await view.act(async()=>Simulate.change(dialog.querySelector('input[type="search"]'),{target:{value:'fe y esperanza'}}));await view.act(async()=>Simulate.submit(dialog.querySelector('form')));
  assert.match(dialog.querySelector('[role="alert"]').textContent,/temporalmente/);const official=dialog.querySelector('a');assert.equal(new URL(official.href).searchParams.get('query'),'fe y esperanza');assert.equal(new URL(official.href).searchParams.get('facet'),'general-conference');
  await view.act(async()=>Simulate.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Catálogo')));assert.ok(!dialog.textContent.includes('temporalmente'));assert.ok(![...dialog.querySelectorAll('button')].some(b=>b.textContent==='Referencia'));
 }finally{await view.close();}
});


test('speaker warnings detect repeated references and the inclusive 30-day calendar window',()=>{
 const dates=load('utils/utilidadesFecha.ts');const {speakerSelectionWarnings}=load('utils/speakerWarnings.ts',{}, {'./utilidadesFecha':dates});
 const records=[{id:1,member_id:42,date:'2026-10-26',completed:'No',speech_title:'Discurso uno',speech_reference_id:71,speech_url:'https://www.churchofjesuschrist.org/study/general-conference/2023/10/31sabin?lang=spa'}, {id:2,member_id:43,date:'2026-10-25',speech_title:'¡Fé y esperanza!',completed:'Si'}, {id:3,member_id:44,date:'2026-11-26',speech_title:'Futuro',completed:'No'}];
 let result=speakerSelectionWarnings(records,{member_id:'42',speech_title:'Discurso uno',speech_reference_id:'71'},null,'2026-11-25');assert.equal(result.previousSpeech.id,1);assert.equal(result.recentMember.id,1);assert.equal(result.daysAgo,30);
 assert.equal(speakerSelectionWarnings(records,{member_id:'43',speech_title:'fe y ESPERANZA'},null,'2026-11-25').previousSpeech.id,2);
 assert.equal(speakerSelectionWarnings(records,{member_id:'43',speech_title:''},null,'2026-11-25').recentMember,null);
 assert.equal(speakerSelectionWarnings(records,{member_id:'44',speech_title:''},null,'2026-11-25').recentMember,null);
 result=speakerSelectionWarnings(records,{member_id:'42',speech_title:'Discurso uno',speech_reference_id:'71'},1,'2026-11-25');assert.equal(result.previousSpeech,null);assert.equal(result.recentMember,null);
 assert.equal(speakerSelectionWarnings(records,{member_id:'',speech_title:'Discurso uno',speech_reference_id:'72'},null,'2026-11-25').previousSpeech,null);
 assert.equal(speakerSelectionWarnings(records,{member_id:'',speech_title:'Otro título',speech_url:'https://churchofjesuschrist.org/study/general-conference/2023/10/31sabin?lang=eng#p1'},null,'2026-11-25').previousSpeech.id,1);
 assert.equal(speakerSelectionWarnings([{...records[0],date:'2026-11-25'}],{member_id:'42',speech_title:''},null,'2026-11-25').daysAgo,0);
});

test('speaker form shows persistent duplicate and recent-member alerts inside the modal on web and mobile',async()=>{
 const {Simulate}=require('react-dom/test-utils'),previous=window.matchMedia;const {businessDate}=load('utils/utilidadesFecha.ts');
 const reference={id:71,title:'Discurso elegido',author:'Autor',conference:'Abril de 2023',url:'https://www.churchofjesuschrist.org/study/general-conference/2023/04/47nelson?lang=spa',topics:['Fe']};
 const record={id:8,member_id:42,member_name:'Ana',tema_id:1,topic:'Fe',date:businessDate(),completed:'No',speech_title:reference.title,speech_reference_id:71,speech_url:reference.url,time:10};
 try{for(const mobile of [false,true]){
  window.matchMedia=()=>({matches:mobile,addEventListener(){},removeEventListener(){}});
  const api={get:async url=>({data:url==='/speakers'?[record]:url==='/speakers/catalog'?[reference]:url==='/speakers/members'?[{id:42,name:'Ana'},{id:43,name:'Luis'}]:url==='/temas'?[{id:1,title:'Fe'}]:[]})};
  const view=await mountPage('pages/Discursantes.tsx',api);
  try{await view.wait();await view.act(async()=>Simulate.click(view.node.querySelector('.speakers-header [aria-label="Buscar discurso"]')));await view.wait();
   const search=document.querySelector('[role="dialog"]');await view.act(async()=>Simulate.click([...search.querySelectorAll('button')].find(b=>b.textContent==='Seleccionar')));
   const form=view.node.querySelector('form');assert.ok(form.querySelector('.speech-reuse-warning[role="alert"]'));assert.match(form.querySelector('.speech-reuse-warning').textContent,/Ana/);
   await view.act(async()=>Simulate.change(form.querySelector('select'),{target:{value:'42'}}));assert.match(form.querySelector('.speaker-recent-warning').textContent,/30 días/);assert.match(form.querySelector('.speaker-recent-warning').textContent,/pendiente/);
   await view.act(async()=>Simulate.change(form.querySelector('select'),{target:{value:'43'}}));assert.equal(form.querySelector('.speaker-recent-warning'),null);
   await view.act(async()=>Simulate.change(form.querySelector('input[type="text"]'),{target:{value:'Otro discurso'}}));assert.equal(form.querySelector('.speech-reuse-warning'),null);
   await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Cerrar formulario"]')));
   if(mobile){await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Acciones del registro"]')));await view.act(async()=>Simulate.click(document.querySelector('.record-actions-menu [aria-label="Editar"]')));}
   else await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Editar"]')));
   assert.equal(view.node.querySelector('.speech-reuse-warning'),null);assert.equal(view.node.querySelector('.speaker-recent-warning'),null);
  }finally{await view.close();}
 }}finally{window.matchMedia=previous;}
});


test('speaker selectors include every registered member and save the user identity',async()=>{
 const {Simulate}=require('react-dom/test-utils');const people=Array.from({length:65},(_,i)=>({id:100+i,name:'Miembro '+String(i+1).padStart(2,'0')}));const calls=[],writes=[];
 const api={get:async url=>{calls.push(url);return {data:url==='/speakers/members'?people:url==='/temas'?[{id:1,title:'Fe'}]:[]};},post:async(url,body)=>{writes.push([url,body]);return {data:{id:1,...body}};}};
 const view=await mountPage('pages/Discursantes.tsx',api);
 try{await view.wait();assert.ok(calls.includes('/speakers/members'));assert.ok(!calls.includes('/students'));
  const filter=view.node.querySelector('select');assert.equal(filter.options.length,66);assert.ok(filter.textContent.includes('Miembro 65'));
  await view.act(async()=>Simulate.click(view.node.querySelector('[aria-label="Agregar discursante"]')));
  const form=view.node.querySelector('form'),select=form.querySelector('select');assert.equal(select.options.length,66);
  await view.act(async()=>Simulate.change(select,{target:{value:'164'}}));
  await view.act(async()=>Simulate.change(form.querySelectorAll('select')[1],{target:{value:'1'}}));
  await view.act(async()=>Simulate.change(form.querySelector('input[type="text"]'),{target:{value:'Discurso'}}));
  await view.act(async()=>Simulate.submit(form));assert.equal(writes[0][1].member_id,'164');assert.match(view.node.querySelector('tbody').textContent,/Miembro 65/);
 }finally{await view.close();}
});


test('Android autofill commits only on Android without transferring credentials and tolerates older builds',async()=>{
 let platform='web',commits=0,fail=false;
 const {completeLoginAutofill}=load('native/androidAutofill.ts',{}, {'@capacitor/core':{Capacitor:{getPlatform:()=>platform},registerPlugin:name=>{assert.equal(name,'AndroidAutofill');return {commitLogin:async(...args)=>{assert.equal(args.length,0);commits++;if(fail)throw Error('Not implemented');}};}}});
 await completeLoginAutofill();assert.equal(commits,0);platform='android';await completeLoginAutofill();assert.equal(commits,1);fail=true;await completeLoginAutofill();assert.equal(commits,2);
});

test('login accepts browser-filled credentials without change events and preserves fields while submitting',async()=>{
 const {Simulate}=require('react-dom/test-utils'),previousFormData=global.FormData;global.FormData=window.FormData;
 let resolveLogin;const posts=[];
 const api={get:async()=>({data:[]}),post:async(url,body)=>{posts.push([url,body]);return await new Promise(resolve=>{resolveLogin=resolve;});}};
 const view=await mountPage('pages/IniciarSesion.tsx',api,{id:1,role:'admin'},true);
 try{
  const form=view.node.querySelector('#login-form'),email=form.querySelector('[name="email"]'),password=form.querySelector('[name="password"]');
  assert.equal(form.getAttribute('autocomplete'),'on');assert.equal(email.getAttribute('autocomplete'),'username');assert.equal(password.getAttribute('autocomplete'),'current-password');assert.equal(email.getAttribute('autocapitalize'),'none');
  // Password managers can populate values without a React change event.
  email.value='guardado@example.test';password.value='clave-guardada';
  await view.act(async()=>Simulate.submit(form));assert.deepEqual(posts,[['/users/login',{email:'guardado@example.test',password:'clave-guardada'}]]);
  assert.equal(email.disabled,false);assert.equal(password.disabled,false);assert.equal(email.readOnly,true);assert.equal(password.readOnly,true);
  await view.act(async()=>resolveLogin({data:{token:'fresh-login',user:{id:42,name:'Usuario',role:'student'}}}));
  assert.equal(localStorage.getItem('token'),'fresh-login');assert.equal(email.readOnly,false);
 }finally{await view.close();global.FormData=previousFormData;}
});

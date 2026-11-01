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

function loadComponent(relativeFile,api,withTheme=false) {
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
  assert.equal(calls.find(([url,config])=>url==="/trip-reservations"&&!config.params.trip_id)[1].params.limit,5);
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
  assert.deepEqual(Array.from(view.node.querySelectorAll('thead th')).map(x=>x.textContent),['Nombre','Documento','Organización','Acciones']);
  assert.equal(view.node.querySelector('.miembros-row-actions').textContent,'');
  const name=view.node.querySelector('.miembros-name');name.focus();
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
   assert.ok(calls.some(([url,config])=>url===resource&&!config.params.trip_id&&config.params.limit===5));
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
  assert.equal(nav.querySelectorAll('.floating-nav-trigger').length,4);assert.equal(nav.querySelectorAll('.floating-nav-submenu').length,0);
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
  const actions=view.node.querySelector('.app-topbar-actions');assert.equal(actions.children.length,2);assert.equal(actions.textContent,'');
  assert.equal(actions.children[0].getAttribute('aria-label'),'Activar tema oscuro');assert.equal(actions.children[1].getAttribute('aria-label'),'Cerrar sesión');
  await view.act(async()=>Simulate.click(actions.children[0]));assert.equal(document.documentElement.getAttribute('data-theme'),'dark');
  const nav=view.node.querySelector('[aria-label="Menú principal"]');assert.equal(nav.querySelector('[aria-label="Mantenimiento"]'),null);
  await view.act(async()=>Simulate.click(nav.querySelector('[aria-label="Enseñanza"]')));assert.ok(nav.querySelector('a[aria-label="Mi perfil"][href="/miembros"]'));
  await view.act(async()=>Simulate.click(actions.children[1]));assert.deepEqual(posts,['/logout']);assert.equal(localStorage.getItem('token'),null);assert.equal(localStorage.getItem('user'),null);assert.equal(localStorage.getItem('theme'),'dark');
 }finally{await view.close();document.documentElement.setAttribute('data-theme','light');localStorage.setItem('theme','light');}
});

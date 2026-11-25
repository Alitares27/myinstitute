import {useEffect,useMemo,useState,useRef} from 'react';
import {createPortal} from 'react-dom';
import {IoAddOutline,IoSearchOutline,IoOpenOutline} from 'react-icons/io5';
import api from '../api';
import FormModal from './FormModal';
import Pagination from './Pagination';
import type {SpeechReference} from '../interfaces/SpeechReference';
import type {Tema} from '../interfaces/Common';
import '../styles/SpeechSearch.css';

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
type OnlineSpeech=Omit<SpeechReference,'id'>&{snippet:string};
export function officialSpeechSearchUrl(query:string){
  const url=new URL('https://www.churchofjesuschrist.org/search');
  url.search=new URLSearchParams({facet:'general-conference',lang:'spa',query,type:'web',page:'1',exact:'false'}).toString();return url.href;
}
export function officialReferenceLink(value:string){
  try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='www.churchofjesuschrist.org'&&/^\/study\/general-conference\//.test(url.pathname)?url.href:null;}catch{return null;}
}
export default function SpeechSearch({temas,initialTopic='',canManage,onSelect,onClose}:{temas:Tema[];initialTopic?:string;canManage:boolean;onSelect:(reference:SpeechReference,topicId:string)=>void;onClose:()=>void}){
  const [references,setReferences]=useState<SpeechReference[]>([]),[query,setQuery]=useState(''),[topic,setTopic]=useState(initialTopic),[page,setPage]=useState(1);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false);
  const [draft,setDraft]=useState({title:'',author:'',conference:'',url:'',topics:initialTopic});
  const [retry,setRetry]=useState(0);
  const [source,setSource]=useState<'catalog'|'online'>('catalog');
  const [online,setOnline]=useState<{items:OnlineSpeech[];page:number;hasNext:boolean}|null>(null);
  const [onlineTerm,setOnlineTerm]=useState(''),[onlineLoading,setOnlineLoading]=useState(false),[onlineError,setOnlineError]=useState('');
  const [selectAfterSave,setSelectAfterSave]=useState(false);
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  const topicId=()=>String(temas.find(t=>normalize(t.title)===normalize(topic))?.id??'');
  const searchTerm=()=>[topic,query.trim()].filter(Boolean).filter((term,index,terms)=>terms.findIndex(t=>normalize(t)===normalize(term))===index).join(' ');
  async function searchOnline(term=searchTerm(),nextPage=1){
    request.current?.abort();const controller=new AbortController();request.current=controller;
    if(!window.navigator.onLine){setOnlineError('Conéctate a internet para buscar en línea. Puedes consultar las referencias del catálogo.');setOnlineLoading(false);return;}
    if(term.trim().length<2||term.length>180){setOnlineError('Escribe entre 2 y 180 caracteres o elige un tema.');setOnlineLoading(false);return;}
    setOnlineLoading(true);setOnlineError('');
    try{const {data}=await api.get('/speakers/search-online',{params:{q:term,page:nextPage},signal:controller.signal});if(controller.signal.aborted)return;setOnline(data);setOnlineTerm(term);}
    catch(error:any){if(!controller.signal.aborted)setOnlineError(error.response?.data?.message||'No se pudo buscar en línea. Revisa tu conexión o abre el sitio oficial.');}
    finally{if(!controller.signal.aborted)setOnlineLoading(false);}
  }
  async function selectOnline(reference:OnlineSpeech){
    const values={title:reference.title,author:reference.author,conference:reference.conference,url:reference.url,topics:(topic||onlineTerm).slice(0,80)};
    if(!reference.author){setDraft(values);setSelectAfterSave(true);setAdding(true);setError('');return;}
    setBusy(true);setOnlineError('');
    try{
      let saved:SpeechReference;
      try{saved=(await api.post<SpeechReference>('/speakers/catalog',{...values,topics:[values.topics]})).data;}
      catch(error:any){if(error.response?.status===409&&error.response.data?.reference)saved=error.response.data.reference;else throw error;}
      onSelect(saved,topicId());
    }catch(error:any){setOnlineError(error.response?.data?.message||'No se pudo guardar la referencia. Comprueba la conexión.');}finally{setBusy(false);}
  }
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');void api.get<SpeechReference[]>('/speakers/catalog',{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted)setReferences(Array.isArray(data)?data:[]);}).catch(()=>{if(!controller.signal.aborted)setError('No se pudo cargar el catálogo. Conéctate e intenta nuevamente.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[retry]);
  const options=useMemo(()=>[...new Set([...temas.map(t=>t.title),...references.flatMap(r=>r.topics),...(initialTopic?[initialTopic]:[])])].sort((a,b)=>a.localeCompare(b,'es')),[temas,references,initialTopic]);
  const filtered=useMemo(()=>references.filter(reference=>{
    const text=normalize([reference.title,reference.author,reference.conference,...reference.topics].join(' '));
    return (!topic||normalize([reference.title,...reference.topics].join(' ')).includes(normalize(topic)))&&normalize(query).split(/\s+/).filter(Boolean).every(word=>text.includes(word));
  }),[references,query,topic]);
  async function save(event:React.FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{let data:SpeechReference;try{data=(await api.post<SpeechReference>('/speakers/catalog',{...draft,topics:draft.topics.split(',').map(t=>t.trim()).filter(Boolean)})).data;}catch(error:any){if(selectAfterSave&&error.response?.status===409&&error.response.data?.reference)data=error.response.data.reference;else throw error;}if(selectAfterSave){onSelect(data,topicId());return;}setReferences(prev=>[...prev,data].sort((a,b)=>a.title.localeCompare(b.title,'es')));setQuery('');setTopic('');setPage(1);setAdding(false);setDraft({title:'',author:'',conference:'',url:'',topics:''});}
    catch(error:any){setError(error.response?.data?.message||'No se pudo guardar la referencia. Revisa la conexión.');}finally{setBusy(false);}
  }
  return createPortal(<FormModal title={adding?(selectAfterSave?'Revisar referencia':'Agregar referencia'):'Buscar discurso'} busy={busy} onClose={onClose}>
    {error&&(adding||source==='catalog')&&<p role="alert">{error}</p>}
    {adding?<form onSubmit={save} className="speech-reference-form">
      <label className="form-group">Título<input required maxLength={250} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label className="form-group">Autor<input required maxLength={150} value={draft.author} onChange={e=>setDraft({...draft,author:e.target.value})}/></label>
      <label className="form-group">Conferencia<input required maxLength={100} placeholder="Abril de 2024" value={draft.conference} onChange={e=>setDraft({...draft,conference:e.target.value})}/></label>
      <label className="form-group">Enlace oficial<input required type="url" maxLength={1000} placeholder="https://www.churchofjesuschrist.org/study/general-conference/…" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})}/></label>
      <label className="form-group">Temas separados por comas<input required placeholder="Fe, Jesucristo, Servicio" value={draft.topics} onChange={e=>setDraft({...draft,topics:e.target.value})}/></label>
      <div className="speech-search-buttons"><button type="button" className="btn secondary" disabled={busy} onClick={()=>{setAdding(false);setSelectAfterSave(false);setError('');}}>Volver</button><button type="submit" className="btn primary" disabled={busy}>{busy?'Guardando…':selectAfterSave?'Seleccionar':'Guardar'}</button></div>
    </form>:<>
      <p>Busca referencias de Conferencia General y revisa el discurso en el sitio oficial antes de asignarlo.</p>
      <div className="speech-search-sources" role="group" aria-label="Origen de búsqueda"><button type="button" className={`btn ${source==='catalog'?'primary':'secondary'}`} aria-pressed={source==='catalog'} onClick={()=>setSource('catalog')}>Catálogo</button><button type="button" className={`btn ${source==='online'?'primary':'secondary'}`} aria-pressed={source==='online'} onClick={()=>setSource('online')}>En línea</button></div>
      <form onSubmit={event=>{event.preventDefault();if(source==='online')void searchOnline();}}><div className="speech-search-filters"><label className="form-group">Tema<select value={topic} onChange={e=>{setTopic(e.target.value);setPage(1);}}><option value="">Todos los temas</option>{options.map(option=><option key={option}>{option}</option>)}</select></label><label className="form-group">Buscar<input type="search" maxLength={180} placeholder="Título, autor o palabra clave" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label></div>{source==='online'&&<button type="submit" className="btn primary" disabled={onlineLoading||busy}><IoSearchOutline aria-hidden="true"/>{onlineLoading?'Buscando…':'Buscar'}</button>}</form>
      {source==='online'?<>
        <p className="text-muted">Resultados del buscador oficial de Conferencia General en español.</p>
        <a className="btn secondary" href={officialSpeechSearchUrl(searchTerm()||onlineTerm)} target="_blank" rel="noopener noreferrer"><IoOpenOutline aria-hidden="true"/>Sitio oficial</a>
        {onlineLoading&&<p role="status">Buscando discursos en línea…</p>}
        {onlineError&&<p role="alert">{onlineError}</p>}
        {!online&&!onlineLoading&&!onlineError&&<p>Elige un tema o escribe una palabra y pulsa Buscar.</p>}
        {online&&!onlineLoading&&<p>Resultados para «{onlineTerm}»{!online.items.length?': no se encontraron discursos.':'.'}</p>}
        {!onlineLoading&&!onlineError&&online&&<><ul className="speech-search-results">{online.items.map(reference=><li key={reference.url}><h3>{reference.title}</h3><p>{reference.author||'Autor por confirmar'} · {reference.conference}</p>{reference.snippet&&<p>{reference.snippet}</p>}<div className="speech-search-buttons">{officialReferenceLink(reference.url)&&<a className="btn secondary" href={officialReferenceLink(reference.url)!} target="_blank" rel="noopener noreferrer"><IoOpenOutline aria-hidden="true"/>Leer</a>}{canManage&&<button type="button" className="btn primary" disabled={busy} onClick={()=>void selectOnline(reference)}>{busy?'Guardando…':'Seleccionar'}</button>}</div></li>)}</ul><nav className="app-pagination" aria-label="Paginación de búsqueda en línea"><span>Página {online.page}</span><div className="app-pagination-buttons"><button type="button" className="btn secondary" disabled={busy||online.page<=1} onClick={()=>void searchOnline(onlineTerm,online.page-1)}>Anterior</button><button type="button" className="btn secondary" disabled={busy||!online.hasNext} onClick={()=>void searchOnline(onlineTerm,online.page+1)}>Siguiente</button></div></nav></>}
      </>:<>
      {canManage&&<button type="button" className="btn secondary" onClick={()=>{setSelectAfterSave(false);setAdding(true);setError('');}}><IoAddOutline aria-hidden="true"/>Referencia</button>}
      {loading&&<p role="status">Cargando catálogo…</p>}
      {!loading&&error&&<button type="button" className="btn secondary" onClick={()=>setRetry(n=>n+1)}>Reintentar</button>}
      {!loading&&!error&&!filtered.length&&<p>No hay discursos para esta búsqueda. Prueba otro tema{canManage?' o agrega una referencia.':'.'}</p>}
      <ul className="speech-search-results">{filtered.slice((page-1)*7,page*7).map(reference=><li key={reference.id}>
        <h3>{reference.title}</h3><p>{reference.author} · {reference.conference}</p><div className="speech-reference-topics">{reference.topics.map(tag=><span key={tag}>{tag}</span>)}</div>
        <div className="speech-search-buttons">{officialReferenceLink(reference.url)&&<a className="btn secondary" href={officialReferenceLink(reference.url)!} target="_blank" rel="noopener noreferrer"><IoOpenOutline aria-hidden="true"/>Leer</a>}{canManage&&<button type="button" className="btn primary" onClick={()=>onSelect(reference,String(temas.find(t=>normalize(t.title)===normalize(topic))?.id??''))}><IoSearchOutline aria-hidden="true"/>Seleccionar</button>}</div>
      </li>)}</ul>
      <Pagination currentPage={page} totalPages={Math.ceil(filtered.length/7)} onChange={setPage}/>
      <p className="text-muted">Las referencias consultadas quedan disponibles según la caché local de la app. Abrir el texto oficial requiere internet. Los temas del catálogo son etiquetas de organización.</p>
      </>}
    </>}
  </FormModal>,document.body);
}

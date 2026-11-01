import { useEffect, useRef, useState } from "react";
import api from "../api";
export function usePagedList<T>(resource:string,params:Record<string,unknown>,enabled=true){
  const [state,setState]=useState<{items:T[];total:number;summary:Record<string,number>;loaded:boolean;loading:boolean;error:string}>({items:[],total:0,summary:{},loaded:false,loading:true,error:""});
  const [revision,setRevision]=useState(0);
  const sequence=useRef(0);
  const key=JSON.stringify(params);
  useEffect(()=>{
    if(!enabled){setState(previous=>({...previous,loading:false,loaded:true}));return;}
    const generation=++sequence.current,controller=new AbortController();
    setState(previous=>({...previous,loading:true,error:""}));
    const timer=setTimeout(()=>{
      api.get(resource,{params:JSON.parse(key),signal:controller.signal}).then(({data})=>{
        if(controller.signal.aborted||generation!==sequence.current)return;
        if(!Array.isArray(data.items))throw new Error("Respuesta paginada inválida");
        setState({items:data.items,total:Number(data.total),summary:data.summary||{},loaded:true,loading:false,error:""});
      }).catch(()=>{
        if(controller.signal.aborted||generation!==sequence.current)return;
        setState(previous=>({...previous,items:[],total:0,summary:{},loaded:true,loading:false,error:"No se pudieron cargar los datos. Reintenta."}));
      });
    },150);
    return()=>{controller.abort();clearTimeout(timer);};
  },[resource,key,revision,enabled]);
  return {...state,refresh:()=>setRevision(value=>value+1)};
}

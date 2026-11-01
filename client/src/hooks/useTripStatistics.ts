import {useEffect,useMemo,useState} from "react";
import api from "../api";
import {businessDate} from "../utils/utilidadesFecha";
import type {Trip} from "../shared/types";
export function useTripStatistics(trips:Trip[],resource:string,revision=0){
 const scheduled=useMemo(()=>trips.filter(trip=>trip.status?.toLowerCase()==='programado'&&!('archived_at' in trip&&trip.archived_at)&&trip.date.slice(0,10)>=businessDate()).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id),[trips]);
 const trip=scheduled[0];
 const id=trip?String(trip.id):"";
 const [result,setResult]=useState<{id:string;revision:number;total:number;summary:Record<string,number>;error:string}|null>(null);
 useEffect(()=>{
  if(!id)return;
  const controller=new AbortController();let active=true;
  api.get(resource,{params:{trip_id:id,page:1,limit:1},signal:controller.signal}).then(({data})=>{
   if(active)setResult({id,revision,total:Number(data.total),summary:data.summary||{},error:""});
  }).catch(()=>{if(active)setResult({id,revision,total:0,summary:{},error:"No se pudieron cargar las estadísticas del viaje"});});
  return()=>{active=false;controller.abort();};
 },[id,resource,revision]);
 const current=result?.id===id&&result.revision===revision?result:null;
 return {trip,total:current?.total||0,summary:current?.summary||{},loading:!!id&&!current,error:current?.error||""};
}

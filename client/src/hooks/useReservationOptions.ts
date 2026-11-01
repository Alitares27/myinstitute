import { useEffect, useState } from "react";
import api from "../api";
export function useReservationOptions(ids:string[],revision=0){
  const [state,setState]=useState<{items:any[];error:string}>({items:[],error:""});
  const key=JSON.stringify([...new Set(ids.filter(Boolean))].sort());
  useEffect(()=>{
    let active=true;const controller=new AbortController();
    setState({items:[],error:""});
    const trips:string[]=JSON.parse(key);
    if(trips.length)Promise.all(trips.map(trip_id=>api.get("/trip-reservations/options",{params:{trip_id},signal:controller.signal})))
      .then(responses=>{if(active)setState({items:responses.flatMap(response=>response.data),error:""});})
      .catch(()=>{if(active&&!controller.signal.aborted)setState({items:[],error:"No se pudieron cargar las reservas del viaje"});});
    return()=>{active=false;controller.abort();};
  },[key,revision]);
  return state;
}

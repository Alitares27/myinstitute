import {formatDate} from "../utils/utilidadesFecha";
import type {Trip} from "../shared/types";
export default function TripStatisticsScope({trip,error,className}:{trip?:Trip;error:string;className?:string}){
 return <section className={className} aria-label="Viaje de las estadísticas" style={{marginBottom:'1rem'}}>
  {trip?<p>Estadísticas del viaje programado: <strong>{formatDate(trip.date)} · {trip.temple_name}</strong></p>:<p role="status">No hay viajes programados próximos. Las estadísticas están en cero.</p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}

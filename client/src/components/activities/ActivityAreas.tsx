import type { Activity } from "../../interfaces/Activity";
export default function ActivityAreas({activity}:{activity:Activity}){
  const areas=[activity.spiritual&&"Espiritual",activity.social&&"Social",activity.physical&&"Físico",activity.intellectual&&"Intelectual"].filter(Boolean);
  return <div className="activity-areas">{areas.length?areas.map(area=><span key={String(area)} className="activity-area-chip">{area}</span>):"—"}</div>;
}

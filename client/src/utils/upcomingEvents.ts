import type { Activity } from "../interfaces/Activity";
import type { Meeting } from "../interfaces/Meeting";

export const localDateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function upcomingWindow(now=new Date()){
  const end=new Date(now.getFullYear(),now.getMonth()+3,1);
  const lastDay=new Date(end.getFullYear(),end.getMonth()+1,0).getDate();
  end.setDate(Math.min(now.getDate(),lastDay));
  return {start:localDateKey(now),end:localDateKey(end)};
}
export type UpcomingEvent={id:string;kind:"Actividad"|"Consejo";title:string;datetime:string;responsible:string;status?:string};
export function upcomingEvents(activities:Activity[],meetings:Meeting[],window:{start:string;end:string}):UpcomingEvent[]{
  const items:UpcomingEvent[]=[
    ...activities.map(activity=>({id:`activity-${activity.id}`,kind:"Actividad" as const,title:activity.activity_name,datetime:activity.activity_datetime.replace(" ","T"),responsible:activity.assigned_to_name||"Sin asignar"})),
    ...meetings.map(meeting=>({id:`meeting-${meeting.id}`,kind:"Consejo" as const,title:meeting.title,datetime:`${meeting.meeting_date.slice(0,10)}T${meeting.start_time||"00:00"}`,responsible:meeting.created_by_name||"Sin asignar",status:meeting.status})),
  ];
  return items.filter(item=>item.datetime.slice(0,10)>=window.start&&item.datetime.slice(0,10)<=window.end).sort((a,b)=>a.datetime.localeCompare(b.datetime)||a.id.localeCompare(b.id));
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IoAddOutline, IoChevronBack, IoChevronForward } from "react-icons/io5";
import { DEFAULT_ACTIVITY_COLOR } from "../../interfaces/Activity";
import type { Activity } from "../../interfaces/Activity";
import "../../styles/CalendarioActividades.css";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const weekFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

function dateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, "0")).join("-");
}

export default function ActivityCalendar({ month, week, activities, canAdd, onPeriod, onSelect }: {
  month: string;
  week: string;
  activities: Activity[];
  canAdd: boolean;
  onPeriod: (date: string, weekly: boolean) => void;
  onSelect: (activity: Activity) => void;
}) {
  const [weekly, setWeekly] = useState(() => window.matchMedia("(max-width: 700px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setWeekly(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const first = new Date(`${month}-01T12:00`);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const today = dateKey(new Date());
  const anchor = new Date(`${week || (today.startsWith(month) ? today : month + "-01")}T12:00`);
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (anchor.getDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const cells = weekly ? 7 : Math.ceil((offset + days) / 7) * 7;
  const periodParams = weekly ? `mes=${month}&semana=${dateKey(anchor)}` : `mes=${month}`;
  const byDate = new Map<string, Activity[]>();
  for (const activity of activities) {
    const day = activity.activity_datetime?.slice(0, 10);
    if (!day) continue;
    const entries = byDate.get(day) ?? [];
    entries.push(activity);
    byDate.set(day, entries);
  }

  function movePeriod(direction: number) {
    if (weekly) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + direction * 7);
      onPeriod(dateKey(next), true);
    } else {
      onPeriod(dateKey(new Date(year, monthIndex + direction, 1)), false);
    }
  }

  return (
    <section aria-label="Calendario de actividades">
      <div className="activity-calendar-toolbar">
        <button type="button" className="btn secondary btn-icon" aria-label={weekly ? "Semana anterior" : "Mes anterior"} onClick={() => movePeriod(-1)}><IoChevronBack /></button>
        <h2 aria-live="polite">{weekly ? `${weekFormatter.format(monday)} al ${weekFormatter.format(sunday)}` : monthFormatter.format(first)}</h2>
        <button type="button" className="btn secondary btn-icon" aria-label={weekly ? "Semana siguiente" : "Mes siguiente"} onClick={() => movePeriod(1)}><IoChevronForward /></button>
        <button type="button" className="btn secondary" onClick={() => onPeriod(today, weekly)}>Hoy</button>
      </div>
      <div className="activity-calendar-scroll">
        <div className={weekly ? "activity-calendar activity-calendar-week" : "activity-calendar"}>
          {!weekly && weekdays.map(day => <div key={day} className="activity-calendar-weekday">{day}</div>)}
          {Array.from({ length: cells }, (_, index) => {
            const day = index - offset + 1;
            if (!weekly && (day < 1 || day > days)) return <div key={index} className="activity-calendar-empty" />;
            const cellDate = weekly ? new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index) : new Date(year, monthIndex, day);
            const date = dateKey(cellDate);
            const label = weekly ? `${weekdays[index]} ${cellDate.getDate()}/${cellDate.getMonth() + 1}` : cellDate.getDate();
            const entries = byDate.get(date) ?? [];
            return (
              <div key={index} className="activity-calendar-day">
                {canAdd ? (
                  <Link className="activity-calendar-date" aria-current={date === today ? "date" : undefined}
                    aria-label={`Agregar actividad el ${weekFormatter.format(cellDate)}`}
                    to={`/actividades/nueva?${periodParams}&fecha=${date}`}>
                    {label}<IoAddOutline aria-hidden="true" />
                  </Link>
                ) : <span className="activity-calendar-date" aria-current={date === today ? "date" : undefined}>{label}</span>}
                {entries.sort((a, b) => a.activity_datetime.localeCompare(b.activity_datetime)).map(activity => (
                  <button type="button" key={activity.id} className="activity-calendar-event"
                    style={{ borderInlineStartColor: /^#[0-9a-f]{6}$/i.test(activity.color ?? "") ? activity.color : DEFAULT_ACTIVITY_COLOR }}
                    onClick={() => onSelect(activity)}>
                    <time>{activity.activity_datetime.slice(11, 16)}</time>
                    <span>{activity.activity_name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

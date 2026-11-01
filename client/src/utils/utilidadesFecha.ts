export const parseLocalDate = (dateString?: string | null): Date | null => {
  if (!dateString) return null;

  const datePart = dateString.split("T")[0].split(" ")[0];
  if (!datePart || !datePart.includes("-")) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed=new Date(year,month-1,day);
  if(parsed.getFullYear()!==year||parsed.getMonth()!==month-1||parsed.getDate()!==day)return null;
  return parsed;
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return "—";

  const cleaned = dateString.replace(" ", "T");
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return dateString;

  const [, year, month, day, hour, minute] = match;

  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const monthName = months[Number(month) - 1];

  return `${day} ${monthName} ${year}, ${hour}:${minute}`;
};

export const formatDateTimeLong = (dateString?: string | null): string => {
  if (!dateString) return "—";

  const cleaned = dateString.replace(" ", "T");
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return dateString;

  const [, year, month, day, hour, minute] = match;

  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const monthName = months[Number(month) - 1];

  return `${Number(day)} de ${monthName} ${year}, ${hour}:${minute}`;
};

export const formatDate = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  const d = parseLocalDate(dateString);
  if (!d || isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-AR", options || { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const toYMD = (dateString?: string | null): string => {
  const d = parseLocalDate(dateString);
  if (!d || isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const businessDate = (now = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

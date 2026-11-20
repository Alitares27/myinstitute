export function attendanceReminder(now: Date, timeZone: string, day: number, time: string): string | null {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (type: string) => Number(parts.find(item => item.type === type)!.value);
  const local = new Date(Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute")));
  const [hour, minute] = time.split(":").map(Number);
  const due = new Date(local);
  due.setUTCDate(due.getUTCDate() - (due.getUTCDay() - day + 7) % 7);
  due.setUTCHours(hour, minute, 0, 0);
  const age = local.getTime() - due.getTime();
  return age >= 0 && age < 86400000 ? due.toISOString().slice(0, 16) : null;
}

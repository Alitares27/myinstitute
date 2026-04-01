export const parseLocalDate = (dateString?: string | null): Date | null => {
  if (!dateString) return null;

  const datePart = dateString.split("T")[0].split(" ")[0];
  if (!datePart || !datePart.includes("-")) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

export const formatDate = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  const d = parseLocalDate(dateString);
  if (!d || isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-AR", options || { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const toYMD = (dateString?: string | null): string => {
  const d = parseLocalDate(dateString);
  if (!d || isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

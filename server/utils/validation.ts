export class InputError extends Error {
  status = 400;
}
export function positiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new InputError("Identificador inválido");
  return id;
}
/** Money is calculated in cents, never by accumulating binary floating point. */
export function cents(value: unknown, allowZero = true): number {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") throw new InputError("Importe requerido");
  const amount = Number(value);
  const result = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(result) || result < 0 || (!allowZero && result === 0) || Math.abs(amount * 100 - result) > 0.00001) {
    throw new InputError("Importe inválido: usa hasta dos decimales y un valor positivo");
  }
  return result;
}
export function isoDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new InputError("Fecha inválida");
  return value;
}
export function reservationBalance(cost: unknown, initial: unknown, installments: unknown) {
  const paid = cents(initial) + cents(installments);
  const total = cents(cost);
  if (paid > total) throw new InputError("Los pagos superan el costo del viaje");
  return { advance: paid / 100, pending: (total - paid) / 100 };
}

/**
 * Día PoM: va de las 09:00 a las 09:00 del día siguiente en America/Argentina/Cordoba.
 *
 * Este archivo es el ÚNICO lugar de la app que calcula a qué día pertenece una fecha.
 * Cualquier otra parte (UI, consultas, resúmenes) debe usar estas funciones.
 */

export const POM_TIMEZONE = "America/Argentina/Cordoba";
export const DEFAULT_DAY_START_HOUR = 9;

/** Fecha de un día PoM en formato `YYYY-MM-DD`. */
export type PomDay = string;

const HOUR_MS = 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: POM_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha calendario (YYYY-MM-DD) de un instante, vista en la zona horaria PoM. */
function localDate(instant: Date): string {
  return dateFormatter.format(instant);
}

/** Desfase (ms) de la zona PoM respecto de UTC en un instante dado. */
export function tzOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: POM_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Devuelve el día PoM al que pertenece un instante.
 * Ej.: 25/11 00:30 (Córdoba) → "2026-11-24"; 25/11 09:00 → "2026-11-25".
 */
export function getPomDay(instant: Date, dayStartHour: number = DEFAULT_DAY_START_HOUR): PomDay {
  return localDate(new Date(instant.getTime() - dayStartHour * HOUR_MS));
}

/** Suma (o resta) días a un día PoM. */
export function addPomDays(day: PomDay, delta: number): PomDay {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/**
 * Rango de instantes [start, end) que abarca un día PoM.
 * Útil para consultar por rango de `started_at`.
 */
export function getPomDayRange(
  day: PomDay,
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): { start: Date; end: Date } {
  return { start: pomDayStart(day, dayStartHour), end: pomDayStart(addPomDays(day, 1), dayStartHour) };
}

function pomDayStart(day: PomDay, dayStartHour: number): Date {
  const [y, m, d] = day.split("-").map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, dayStartHour);
  // Primer intento con el desfase de ese momento; segundo pase por si cruza un cambio de horario.
  let guess = wallClockAsUtc - tzOffsetMs(new Date(wallClockAsUtc));
  guess = wallClockAsUtc - tzOffsetMs(new Date(guess));
  return new Date(guess);
}

/**
 * Instante → texto para un `<input type="datetime-local">` en hora de Córdoba
 * ("YYYY-MM-DDTHH:MM").
 */
export function toLocalInput(instant: Date): string {
  return new Date(instant.getTime() + tzOffsetMs(instant)).toISOString().slice(0, 16);
}

/** Texto de un `<input type="datetime-local">` (hora de Córdoba) → instante. Null si no es válido. */
export function fromLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wallClockAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wallClockAsUtc)) return null;
  let guess = wallClockAsUtc - tzOffsetMs(new Date(wallClockAsUtc));
  guess = wallClockAsUtc - tzOffsetMs(new Date(guess));
  const out = new Date(guess);
  // Rechaza fechas imposibles (31/02, 25:00…) que Date.UTC "corrige" solo.
  return toLocalInput(out) === value ? out : null;
}

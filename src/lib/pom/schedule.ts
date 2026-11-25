import { POM_TIMEZONE } from "./day";
import { getPomStatus } from "./session";
import { SECTORS, type PomSession, type ScheduleSlot, type Sector } from "./types";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Hora local de Córdoba en minutos desde la medianoche. */
export function localMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: POM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

const inSlot = (slot: ScheduleSlot, minutes: number) =>
  toMinutes(slot.start) <= minutes && minutes < toMinutes(slot.end);

/** Eje del día (franja horaria de la rutina) que corresponde a un instante (end exclusivo). */
export function getSlotAt(schedule: ScheduleSlot[], instant: Date): ScheduleSlot | null {
  const now = localMinutes(instant);
  return schedule.find((s) => inSlot(s, now)) ?? null;
}

export interface SlotProgress {
  slot: ScheduleSlot;
  /** Número del próximo bloque dentro del eje (1 = el primero). */
  blockNumber: number;
  /** Cantidad de referencia del eje, si tiene. */
  total: number | null;
  /** Pista de foco para ese bloque (PER-93), si hay y están activadas. */
  hint: string | null;
}

/**
 * Eje actual y en qué bloque vas (PER-90). El número sale de los PoM ya
 * completados en ese eje y ese sector durante el día PoM, no del reloj:
 * si arrancás tarde, igual te propone el bloque 1.
 */
export function getSlotProgress(
  schedule: ScheduleSlot[],
  todaysPoms: Pick<PomSession, "sector" | "started_at" | "ends_at" | "discarded_at" | "interrupted_at">[],
  now: Date,
  showHints = true,
): SlotProgress | null {
  const slot = getSlotAt(schedule, now);
  if (!slot?.sector) return null;
  const done = todaysPoms.filter(
    (p) =>
      p.sector === slot.sector &&
      getPomStatus(p, now) === "completed" &&
      inSlot(slot, localMinutes(new Date(p.started_at))),
  ).length;
  const blockNumber = done + 1;
  return {
    slot,
    blockNumber,
    total: slot.pom_count,
    hint: showHints ? (slot.focus_hints?.[String(blockNumber)]?.trim() || null) : null,
  };
}

/** "HH:MM" en hora de Córdoba. */
export function formatLocalTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: POM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/**
 * Valida y normaliza el esquema horario que llega del formulario de ajustes (PER-89).
 * Devuelve los ejes ordenados o un mensaje de error para el usuario.
 */
export function validateSchedule(input: unknown): { ok: true; schedule: ScheduleSlot[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Tiene que haber al menos un eje." };
  if (input.length > 24) return { ok: false, error: "Demasiados ejes (máximo 24)." };

  const out: ScheduleSlot[] = [];
  for (const raw of input) {
    const s = raw as Partial<ScheduleSlot>;
    const label = typeof s.label === "string" ? s.label.trim() : "";
    const name = label || `${s.start}–${s.end}`;
    if (typeof s.start !== "string" || typeof s.end !== "string" || !HHMM.test(s.start) || !HHMM.test(s.end) || s.start === "24:00") {
      return { ok: false, error: `Eje "${name}": las horas van como HH:MM (fin hasta 24:00).` };
    }
    if (toMinutes(s.end) <= toMinutes(s.start)) {
      return { ok: false, error: `Eje "${name}": el fin tiene que ser después del inicio. Para cruzar la medianoche, dividila en dos.` };
    }
    if (!label || label.length > 60) return { ok: false, error: "Cada eje necesita un nombre (hasta 60 caracteres)." };
    const sector = s.sector ?? null;
    if (sector !== null && !SECTORS.includes(sector as Sector)) return { ok: false, error: `Eje "${name}": sector inválido.` };
    let pomCount: number | null = null;
    if (s.pom_count != null) {
      if (!Number.isInteger(s.pom_count) || s.pom_count < 1 || s.pom_count > 20) {
        return { ok: false, error: `Eje "${name}": la cantidad de PoM va de 1 a 20.` };
      }
      pomCount = s.pom_count;
    }
    const slot: ScheduleSlot = { start: s.start, end: s.end, label, sector, pom_count: pomCount };
    if (s.focus_hints && typeof s.focus_hints === "object") {
      const hints: Record<string, string> = {};
      for (const [k, v] of Object.entries(s.focus_hints)) {
        const n = Number(k);
        const text = typeof v === "string" ? v.trim() : "";
        if (!Number.isInteger(n) || n < 1 || n > 20 || !text) continue;
        hints[String(n)] = text.slice(0, 80);
      }
      if (Object.keys(hints).length) slot.focus_hints = hints;
    }
    out.push(slot);
  }

  out.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 1; i < out.length; i++) {
    if (toMinutes(out[i].start) < toMinutes(out[i - 1].end)) {
      return { ok: false, error: `Los ejes "${out[i - 1].label}" y "${out[i].label}" se superponen.` };
    }
  }
  return { ok: true, schedule: out };
}

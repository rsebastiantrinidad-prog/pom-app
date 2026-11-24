import { POM_TIMEZONE } from "./day";
import type { ScheduleSlot } from "./types";

const toMinutes = (hhmm: string) => {
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

/** Franja de la rutina que corresponde a un instante (end exclusivo). */
export function getSlotAt(schedule: ScheduleSlot[], instant: Date): ScheduleSlot | null {
  const now = localMinutes(instant);
  return schedule.find((s) => toMinutes(s.start) <= now && now < toMinutes(s.end)) ?? null;
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

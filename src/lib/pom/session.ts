import type { PomSession } from "./types";

/**
 * Estado derivado de un PoM (PER-87). No se guarda en la base: se calcula a partir
 * de las fechas, así un bloque se completa aunque la app esté cerrada.
 */
export type PomStatus = "running" | "completed" | "discarded" | "interrupted";

/** Minutos durante los que se puede descartar un bloque (la base lo valida igual). */
export const DISCARD_WINDOW_MINUTES = 2;

type SessionTimes = Pick<PomSession, "started_at" | "ends_at" | "discarded_at" | "interrupted_at">;

const ms = (iso: string) => new Date(iso).getTime();

export function getPomStatus(s: SessionTimes, now: Date = new Date()): PomStatus {
  if (s.discarded_at) return "discarded";
  if (s.interrupted_at) return "interrupted";
  return now.getTime() >= ms(s.ends_at) ? "completed" : "running";
}

/** Milisegundos que faltan, calculados siempre como `ends_at - ahora` (PER-84). */
export function getRemainingMs(s: Pick<PomSession, "ends_at">, now: Date = new Date()): number {
  return Math.max(0, ms(s.ends_at) - now.getTime());
}

export function canDiscard(s: SessionTimes, now: Date = new Date()): boolean {
  return (
    getPomStatus(s, now) === "running" &&
    now.getTime() - ms(s.started_at) <= DISCARD_WINDOW_MINUTES * 60_000
  );
}

export function canInterrupt(s: SessionTimes, now: Date = new Date()): boolean {
  return getPomStatus(s, now) === "running";
}

/** Minutos trabajados: hasta la interrupción, el fin o ahora (lo que ocurra primero). */
export function getWorkedMinutes(s: SessionTimes, now: Date = new Date()): number {
  if (s.discarded_at) return 0;
  const end = Math.min(ms(s.interrupted_at ?? s.ends_at), now.getTime());
  return Math.max(0, Math.floor((end - ms(s.started_at)) / 60_000));
}

export function needsRating(s: SessionTimes & Pick<PomSession, "rating">, now: Date = new Date()): boolean {
  return getPomStatus(s, now) === "completed" && s.rating == null;
}

/** "mm:ss" para la cuenta regresiva. */
export function formatCountdown(remainingMs: number): string {
  const total = Math.ceil(remainingMs / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

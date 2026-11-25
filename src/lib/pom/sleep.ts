import type { SleepSession } from "./types";

const MIN_MS = 60_000;

/** Una sesión no puede durar más que esto (evita errores de tipeo al corregir). */
export const MAX_SLEEP_HOURS = 24;
/** Una sesión abierta hace más que esto probablemente quedó olvidada (PER-95). */
export const FORGOTTEN_SLEEP_HOURS = 14;

type SleepLite = Pick<SleepSession, "started_at" | "ended_at">;

/** Minutos dormidos. Una sesión abierta cuenta hasta `now`. */
export function sleepMinutes(s: SleepLite, now: Date): number {
  const end = s.ended_at ? new Date(s.ended_at).getTime() : now.getTime();
  return Math.max(0, Math.floor((end - new Date(s.started_at).getTime()) / MIN_MS));
}

/** Total de minutos dormidos de varias sesiones (ej. noche + siesta del mismo día PoM). */
export function totalSleepMinutes(sessions: SleepLite[], now: Date): number {
  return sessions.reduce((acc, s) => acc + sleepMinutes(s, now), 0);
}

/** 445 → "7 h 25 min"; 40 → "40 min"; 120 → "2 h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function isForgotten(s: SleepLite, now: Date): boolean {
  return !s.ended_at && now.getTime() - new Date(s.started_at).getTime() > FORGOTTEN_SLEEP_HOURS * 60 * MIN_MS;
}

/**
 * Reglas para registrar o corregir una sesión de sueño (PER-95). `ended` null =
 * sigue abierta. `others` son las demás sesiones que podrían superponerse.
 */
export function validateSleepRange(
  started: Date,
  ended: Date | null,
  others: SleepLite[],
  now: Date,
): { ok: true } | { ok: false; error: string } {
  const tolerance = MIN_MS; // el reloj del celular y el del servidor pueden diferir un poco
  if (started.getTime() > now.getTime() + tolerance) return { ok: false, error: "El inicio no puede ser en el futuro." };
  if (ended) {
    if (ended.getTime() > now.getTime() + tolerance) return { ok: false, error: "El fin no puede ser en el futuro." };
    if (ended <= started) return { ok: false, error: "El fin tiene que ser después del inicio." };
    if (ended.getTime() - started.getTime() > MAX_SLEEP_HOURS * 60 * MIN_MS)
      return { ok: false, error: `Una sesión no puede durar más de ${MAX_SLEEP_HOURS} horas.` };
  }
  const end = (ended ?? now).getTime();
  const clash = others.some((o) => {
    const oStart = new Date(o.started_at).getTime();
    const oEnd = o.ended_at ? new Date(o.ended_at).getTime() : now.getTime();
    return oStart < end && oEnd > started.getTime();
  });
  if (clash) return { ok: false, error: "Se superpone con otra sesión de sueño." };
  return { ok: true };
}

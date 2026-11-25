"use server";

import { refresh } from "next/cache";
import { getSettings, saveSchedule } from "@/lib/db";
import { savePhoneApps, saveUsage } from "@/lib/db/phone";
import { discardPom, getRunningPom, interruptPom, ratePom, startPom } from "@/lib/db/poms";
import { getOpenSleep, getSleep, listSleepNear, startSleep, updateSleep } from "@/lib/db/sleep";
import {
  fromLocalInput,
  getPomDay,
  getSlotAt,
  parseHoursMinutes,
  SECTORS,
  validatePhoneApps,
  validateSchedule,
  validateSleepRange,
  type Sector,
} from "@/lib/pom";

// Cloudflare Access (PER-113) filtra quién llega hasta acá, pero estas acciones
// igual validan todo lo que reciben: son endpoints POST como cualquier otro.

export type ActionResult = { ok: true } | { ok: false; error: string };

const isSector = (v: unknown): v is Sector => SECTORS.includes(v as Sector);

/** Traduce los errores de la base (CHECK y triggers) a mensajes para el usuario. */
function fail(e: unknown, fallback: string): ActionResult {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Ya hay un PoM en curso")) return { ok: false, error: "Ya hay un PoM en curso." };
  if (msg.includes("sleep_sessions") && msg.includes("UNIQUE"))
    return { ok: false, error: "Ya hay una sesión de sueño abierta." };
  console.error(fallback, msg);
  return { ok: false, error: fallback };
}

export async function startPomAction(objective: string, sector: string): Promise<ActionResult> {
  const text = objective.trim();
  if (!text) return { ok: false, error: "Escribí el objetivo del bloque." };
  if (text.length > 500) return { ok: false, error: "El objetivo es demasiado largo." };
  if (!isSector(sector)) return { ok: false, error: "Elegí un sector." };

  const settings = await getSettings();
  const now = new Date();
  if (await getOpenSleep()) return { ok: false, error: "Estás durmiendo: tocá “Desperté” primero." };
  try {
    await startPom({
      objective: text,
      sector,
      sectorSuggested: getSlotAt(settings.schedule, now)?.sector ?? null,
      now,
      pomMinutes: settings.pom_minutes,
      dayStartHour: settings.day_start_hour,
    });
  } catch (e) {
    return fail(e, "No se pudo iniciar el PoM.");
  }
  refresh();
  return { ok: true };
}

export async function discardPomAction(id: string): Promise<ActionResult> {
  try {
    if (!(await discardPom(id, new Date()))) return { ok: false, error: "Ese PoM ya no está en curso." };
  } catch (e) {
    return fail(e, "Ya pasaron los 2 minutos: ahora solo se puede interrumpir.");
  }
  refresh();
  return { ok: true };
}

export async function interruptPomAction(id: string, note: string): Promise<ActionResult> {
  const text = note.trim();
  if (!text) return { ok: false, error: "Escribí qué pasó para poder interrumpir." };
  if (text.length > 1000) return { ok: false, error: "La observación es demasiado larga." };
  try {
    if (!(await interruptPom(id, text, new Date()))) return { ok: false, error: "Ese PoM ya no está en curso." };
  } catch (e) {
    return fail(e, "El bloque ya terminó: quedó como completado.");
  }
  refresh();
  return { ok: true };
}

export async function ratePomAction(id: string, rating: number, note: string): Promise<ActionResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Elegí de 1 a 5 estrellas." };
  const text = note.trim().slice(0, 500) || null;
  try {
    if (!(await ratePom(id, rating, text, new Date()))) return { ok: false, error: "Ese PoM todavía no terminó." };
  } catch (e) {
    return fail(e, "Este PoM no se puede valorar.");
  }
  refresh();
  return { ok: true };
}

export async function saveScheduleAction(schedule: unknown, showFocusHints: boolean): Promise<ActionResult> {
  const res = validateSchedule(schedule);
  if (!res.ok) return res;
  try {
    await saveSchedule(res.schedule, showFocusHints === true);
  } catch (e) {
    return fail(e, "No se pudo guardar la configuración.");
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Sueño (PER-94, PER-95)
// ---------------------------------------------------------------------------

export async function startSleepAction(): Promise<ActionResult> {
  const now = new Date();
  if (await getRunningPom(now)) return { ok: false, error: "Hay un PoM en curso: terminalo o interrumpilo primero." };
  if (await getOpenSleep()) return { ok: false, error: "Ya hay una sesión de sueño abierta." };
  const settings = await getSettings();
  try {
    await startSleep(now, getPomDay(now, settings.day_start_hour));
  } catch (e) {
    return fail(e, "No se pudo registrar.");
  }
  refresh();
  return { ok: true };
}

/**
 * Corrige una sesión (o la cierra: "Desperté"). Las horas llegan como texto de
 * `datetime-local` en hora de Córdoba. `end` vacío = sigue abierta (solo si ya lo estaba).
 * Sin `start`/`end` cierra la sesión ahora.
 */
export async function saveSleepAction(id: string, start?: string, end?: string): Promise<ActionResult> {
  if (typeof id !== "string" || !id) return { ok: false, error: "Sesión inválida." };
  const session = await getSleep(id);
  if (!session) return { ok: false, error: "No se encontró esa sesión." };

  const now = new Date();
  const startedAt = start === undefined ? new Date(session.started_at) : fromLocalInput(start);
  if (!startedAt) return { ok: false, error: "Revisá la hora de inicio." };
  let endedAt: Date | null;
  if (end === undefined) endedAt = now;
  else if (end === "") {
    if (session.ended_at) return { ok: false, error: "Poné la hora en que te despertaste." };
    endedAt = null;
  } else {
    endedAt = fromLocalInput(end);
    if (!endedAt) return { ok: false, error: "Revisá la hora de fin." };
  }

  const others = await listSleepNear(startedAt, endedAt ?? now, id);
  const check = validateSleepRange(startedAt, endedAt, others, now);
  if (!check.ok) return check;

  const settings = await getSettings();
  try {
    if (!(await updateSleep(id, startedAt, endedAt, getPomDay(startedAt, settings.day_start_hour))))
      return { ok: false, error: "No se encontró esa sesión." };
  } catch (e) {
    return fail(e, "No se pudo guardar la corrección.");
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Uso del móvil (PER-96, PER-97)
// ---------------------------------------------------------------------------

export async function savePhoneUsageAction(
  day: string,
  entries: { app: string; hours: string; minutes: string }[],
): Promise<ActionResult> {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: "Día inválido." };
  if (!Array.isArray(entries)) return { ok: false, error: "Datos inválidos." };
  const settings = await getSettings();
  if (day > getPomDay(new Date(), settings.day_start_hour)) return { ok: false, error: "Ese día todavía no llegó." };

  const names = new Set(settings.phone_apps.map((a) => a.name));
  const toSave: { app: string; minutes: number }[] = [];
  for (const e of entries) {
    if (!e || typeof e.app !== "string" || !names.has(e.app)) return { ok: false, error: "App desconocida." };
    const minutes = parseHoursMinutes(String(e.hours ?? ""), String(e.minutes ?? ""));
    if (minutes === null) return { ok: false, error: `Revisá el tiempo de ${e.app} (máximo 24 h).` };
    if (minutes !== undefined) toSave.push({ app: e.app, minutes });
  }
  if (!toSave.length) return { ok: false, error: "Cargá al menos una app." };
  try {
    await saveUsage(day, toSave);
  } catch (e) {
    return fail(e, "No se pudo guardar el uso del móvil.");
  }
  refresh();
  return { ok: true };
}

export async function savePhoneAppsAction(apps: unknown): Promise<ActionResult> {
  const settings = await getSettings();
  const res = validatePhoneApps(apps, settings.phone_apps);
  if (!res.ok) return res;
  try {
    await savePhoneApps(res.apps, res.renames);
  } catch (e) {
    return fail(e, "No se pudo guardar la lista de apps.");
  }
  refresh();
  return { ok: true };
}

"use server";

import { refresh } from "next/cache";
import { getSettings, saveSchedule } from "@/lib/db";
import { discardPom, interruptPom, ratePom, startPom } from "@/lib/db/poms";
import { getSlotAt, SECTORS, validateSchedule, type Sector } from "@/lib/pom";

// Cloudflare Access (PER-113) filtra quién llega hasta acá, pero estas acciones
// igual validan todo lo que reciben: son endpoints POST como cualquier otro.

export type ActionResult = { ok: true } | { ok: false; error: string };

const isSector = (v: unknown): v is Sector => SECTORS.includes(v as Sector);

/** Traduce los errores de la base (CHECK y triggers) a mensajes para el usuario. */
function fail(e: unknown, fallback: string): ActionResult {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Ya hay un PoM en curso")) return { ok: false, error: "Ya hay un PoM en curso." };
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

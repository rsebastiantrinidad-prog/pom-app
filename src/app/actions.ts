"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { SUMMARY_SEEN_COOKIE } from "@/lib/summary-cookie";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import { getSettings, saveSchedule } from "@/lib/db";
import { savePhoneApps, saveUsage } from "@/lib/db/phone";
import { discardPom, getRunningPom, interruptPom, ratePom, startPom } from "@/lib/db/poms";
import { disablePushSubscription, savePushSubscription, scheduleEndAlarm, sendTestPush } from "@/lib/db/push";
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

  const now = new Date();
  const [settings, openSleep] = await Promise.all([getSettings(), getOpenSleep()]);
  if (openSleep) return { ok: false, error: "Estás durmiendo: tocá “Desperté” primero." };
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
  // Aviso push al terminar (PER-106): llega aunque el celular esté bloqueado.
  await scheduleEndAlarm(new Date(now.getTime() + settings.pom_minutes * 60_000));
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

/** Cierra el resumen matinal (PER-99): no vuelve a aparecer ese día PoM en este dispositivo. */
export async function dismissSummaryAction(day: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: "Día inválido." };
  (await cookies()).set(SUMMARY_SEEN_COOKIE, day, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 3 * 24 * 60 * 60,
  });
  refresh();
  return { ok: true };
}

/** Guarda el tema elegido (Sistema / Claro / Oscuro). La página ya lo aplicó al instante. */
export async function setThemeAction(theme: string): Promise<ActionResult> {
  if (!isTheme(theme)) return { ok: false, error: "Tema inválido." };
  (await cookies()).set(THEME_COOKIE, theme, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 400 * 24 * 60 * 60,
  });
  return { ok: true };
}

/** Guarda la suscripción push de este dispositivo (PER-106). */
export async function savePushSubscriptionAction(sub: unknown, userAgent: string): Promise<ActionResult> {
  const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || s.endpoint.length > 2000)
    return { ok: false, error: "Suscripción inválida." };
  const str = (v: unknown) => (typeof v === "string" && v.length < 500 ? v : null);
  try {
    await savePushSubscription(
      { endpoint: s.endpoint, p256dh: str(s.keys?.p256dh), auth: str(s.keys?.auth) },
      userAgent.slice(0, 300),
    );
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo activar el aviso.");
  }
}

export async function disablePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return { ok: false, error: "Inválido." };
  await disablePushSubscription(endpoint);
  return { ok: true };
}

/** Manda un aviso de prueba a todos los dispositivos activados. */
export async function testPushAction(): Promise<ActionResult> {
  try {
    const { sent, failed } = await sendTestPush();
    if (!sent) return { ok: false, error: failed ? "No se pudo entregar el aviso." : "No hay dispositivos activados." };
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo enviar el aviso de prueba.");
  }
}

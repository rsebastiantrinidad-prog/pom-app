import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DEFAULT_SETTINGS, normalizePhoneApps, type AppSettings, type ScheduleSlot } from "@/lib/pom";

/**
 * Base de datos D1 (SQLite en Cloudflare). Solo se usa del lado del servidor:
 * el navegador nunca habla directo con la base ni ve credenciales.
 */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

interface AppSettingsRow {
  day_start_hour: number;
  pom_minutes: number;
  rest_minutes: number;
  schedule: string;
  phone_apps: string;
  show_focus_hints: number;
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db
    .prepare(
      "SELECT day_start_hour, pom_minutes, rest_minutes, schedule, phone_apps, show_focus_hints FROM app_settings WHERE id = 1",
    )
    .first<AppSettingsRow>();
  if (!row) return DEFAULT_SETTINGS;
  return {
    day_start_hour: row.day_start_hour,
    pom_minutes: row.pom_minutes,
    rest_minutes: row.rest_minutes,
    schedule: JSON.parse(row.schedule),
    phone_apps: normalizePhoneApps(JSON.parse(row.phone_apps)),
    show_focus_hints: row.show_focus_hints === 1,
  };
}

/** Guarda el esquema horario (ya validado con `validateSchedule`) y si se muestran las pistas. */
export async function saveSchedule(schedule: ScheduleSlot[], showFocusHints: boolean): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE app_settings SET schedule = json(?), show_focus_hints = ? WHERE id = 1")
    .bind(JSON.stringify(schedule), showFocusHints ? 1 : 0)
    .run();
}

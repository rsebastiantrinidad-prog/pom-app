import "server-only";
import type { PhoneApp, PhoneUsage, PomDay } from "@/lib/pom";
import { getDb } from "./index";

/** Acceso a `phone_usage` (PER-96) y a la lista de apps (PER-97). */

export async function listUsageForDay(day: PomDay): Promise<PhoneUsage[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM phone_usage WHERE pom_day = ? ORDER BY app")
    .bind(day)
    .all<PhoneUsage>();
  return results;
}

/** Un solo valor por día y app: si ya existe, se reemplaza. Todo en una transacción. */
export async function saveUsage(day: PomDay, entries: { app: string; minutes: number }[]): Promise<void> {
  if (!entries.length) return;
  const db = await getDb();
  const stmt = db.prepare(
    `INSERT INTO phone_usage (pom_day, app, minutes) VALUES (?, ?, ?)
     ON CONFLICT (pom_day, app) DO UPDATE SET minutes = excluded.minutes`,
  );
  await db.batch(entries.map((e) => stmt.bind(day, e.app, e.minutes)));
}

/**
 * Guarda la lista de apps. Al renombrar, también se renombran sus registros
 * históricos para no perder datos. Todo en una transacción.
 */
export async function savePhoneApps(apps: PhoneApp[], renames: { from: string; to: string }[]): Promise<void> {
  const db = await getDb();
  // Pasa por un nombre temporal para permitir intercambios (A↔B) sin chocar con UNIQUE(pom_day, app).
  const tmp = (i: number) => `__pom_rename_${i}__`;
  await db.batch([
    ...renames.map((r, i) => db.prepare("UPDATE phone_usage SET app = ? WHERE app = ?").bind(tmp(i), r.from)),
    ...renames.map((r, i) => db.prepare("UPDATE phone_usage SET app = ? WHERE app = ?").bind(r.to, tmp(i))),
    db.prepare("UPDATE app_settings SET phone_apps = json(?) WHERE id = 1").bind(JSON.stringify(apps)),
  ]);
}

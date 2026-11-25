import "server-only";
import type { PomDay, SleepSession } from "@/lib/pom";
import { getDb } from "./index";

/** Acceso a `sleep_sessions` (PER-94, PER-95). La base asegura una sola sesión abierta. */

export async function listSleepForDays(days: PomDay[]): Promise<SleepSession[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT * FROM sleep_sessions WHERE pom_day IN (${days.map(() => "?").join(",")}) ORDER BY started_at`)
    .bind(...days)
    .all<SleepSession>();
  return results;
}

export async function getOpenSleep(): Promise<SleepSession | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM sleep_sessions WHERE ended_at IS NULL LIMIT 1").first<SleepSession>();
}

export async function getSleep(id: string): Promise<SleepSession | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM sleep_sessions WHERE id = ?").bind(id).first<SleepSession>();
}

/** Sesiones que podrían superponerse con [start, end) — para validar correcciones. */
export async function listSleepNear(start: Date, end: Date, excludeId?: string): Promise<SleepSession[]> {
  const db = await getDb();
  const day = 24 * 60 * 60_000;
  const { results } = await db
    .prepare(
      `SELECT * FROM sleep_sessions
       WHERE id IS NOT ? AND started_at < ? AND coalesce(ended_at, ?) > ?`,
    )
    .bind(
      excludeId ?? null,
      new Date(end.getTime() + day).toISOString(),
      "9999-12-31T00:00:00.000Z",
      new Date(start.getTime() - day).toISOString(),
    )
    .all<SleepSession>();
  return results;
}

export async function startSleep(now: Date, pomDay: PomDay): Promise<void> {
  const db = await getDb();
  await db.prepare("INSERT INTO sleep_sessions (started_at, pom_day) VALUES (?, ?)").bind(now.toISOString(), pomDay).run();
}

/** Devuelve true si se actualizó una fila. */
export async function updateSleep(id: string, startedAt: Date, endedAt: Date | null, pomDay: PomDay): Promise<boolean> {
  const db = await getDb();
  const { meta } = await db
    .prepare("UPDATE sleep_sessions SET started_at = ?, ended_at = ?, pom_day = ? WHERE id = ?")
    .bind(startedAt.toISOString(), endedAt?.toISOString() ?? null, pomDay, id)
    .run();
  return meta.changes > 0;
}

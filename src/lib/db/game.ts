import "server-only";
import { computeGame, getPomDay, type AppSettings, type GameStats, type PomSession, type SleepSession } from "@/lib/pom";
import { getDb } from "./index";

/** Gamificación calculada sobre todo el historial (son pocas filas por día). */
export async function getGameStats(settings: AppSettings, now: Date): Promise<GameStats> {
  const db = await getDb();
  const [poms, sleeps] = await db.batch([
    db.prepare(
      "SELECT sector, pom_day, started_at, ends_at, discarded_at, interrupted_at, rating FROM pom_sessions WHERE discarded_at IS NULL",
    ),
    db.prepare("SELECT pom_day, started_at, ended_at FROM sleep_sessions WHERE ended_at IS NOT NULL"),
  ]);
  return computeGame({
    poms: poms.results as Pick<PomSession, "sector" | "pom_day" | "started_at" | "ends_at" | "discarded_at" | "interrupted_at" | "rating">[],
    sleeps: sleeps.results as Pick<SleepSession, "pom_day" | "started_at" | "ended_at">[],
    schedule: settings.schedule,
    today: getPomDay(now, settings.day_start_hour),
    now,
  });
}

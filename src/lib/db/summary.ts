import "server-only";
import {
  daysBetween,
  summarizeDay,
  type DaySummary,
  type PhoneUsage,
  type PomDay,
  type PomSession,
  type SleepSession,
} from "@/lib/pom";
import { getDb } from "./index";

/**
 * Resumen por día de un rango (PER-98, PER-100, PER-101, PER-110): tres consultas
 * por `pom_day` y el armado en `summarizeDay`, así los números salen de las
 * mismas filas que la lista del día.
 */
export async function getDaySummaries(from: PomDay, to: PomDay, now: Date): Promise<DaySummary[]> {
  const db = await getDb();
  const [poms, sleeps, usage] = await db.batch([
    db.prepare("SELECT * FROM pom_sessions WHERE pom_day BETWEEN ? AND ? ORDER BY started_at").bind(from, to),
    db.prepare("SELECT * FROM sleep_sessions WHERE pom_day BETWEEN ? AND ? ORDER BY started_at").bind(from, to),
    db.prepare("SELECT pom_day, app, minutes FROM phone_usage WHERE pom_day BETWEEN ? AND ?").bind(from, to),
  ]);
  const p = poms.results as PomSession[];
  const s = sleeps.results as SleepSession[];
  const u = usage.results as Pick<PhoneUsage, "pom_day" | "app" | "minutes">[];
  return daysBetween(from, to).map((day) =>
    summarizeDay(
      day,
      p,
      s,
      u.filter((x) => x.pom_day === day),
      now,
    ),
  );
}

export async function getDaySummary(day: PomDay, now: Date): Promise<DaySummary> {
  return (await getDaySummaries(day, day, now))[0];
}

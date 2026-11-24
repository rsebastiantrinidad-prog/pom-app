import "server-only";
import { getPomDay, type PomDay, type PomSession, type Sector } from "@/lib/pom";
import { getDb } from "./index";

/**
 * Acceso a `pom_sessions`. Las reglas del spec (un solo PoM en curso, descarte en
 * 2 minutos, interrupción con observación, etc.) las valida también la base; acá
 * solo se arman las consultas.
 */

export async function listPomsForDay(day: PomDay): Promise<PomSession[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM pom_sessions WHERE pom_day = ? ORDER BY started_at")
    .bind(day)
    .all<PomSession>();
  return results;
}

/** El bloque en curso, si hay uno (no descartado, no interrumpido y sin terminar). */
export async function getRunningPom(now: Date): Promise<PomSession | null> {
  const db = await getDb();
  return db
    .prepare(
      `SELECT * FROM pom_sessions
       WHERE discarded_at IS NULL AND interrupted_at IS NULL AND ends_at > ?
       ORDER BY started_at DESC LIMIT 1`,
    )
    .bind(now.toISOString())
    .first<PomSession>();
}

export async function startPom(input: {
  objective: string;
  sector: Sector;
  sectorSuggested: Sector | null;
  now: Date;
  pomMinutes: number;
  dayStartHour: number;
}): Promise<void> {
  const db = await getDb();
  const startedAt = input.now.toISOString();
  const endsAt = new Date(input.now.getTime() + input.pomMinutes * 60_000).toISOString();
  await db
    .prepare(
      `INSERT INTO pom_sessions (sector, sector_suggested, objective, started_at, ends_at, pom_day)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.sector,
      input.sectorSuggested,
      input.objective,
      startedAt,
      endsAt,
      getPomDay(input.now, input.dayStartHour),
    )
    .run();
}

/** Devuelve true si se actualizó una fila. */
async function update(sql: string, ...params: unknown[]): Promise<boolean> {
  const db = await getDb();
  const { meta } = await db.prepare(sql).bind(...params).run();
  return meta.changes > 0;
}

export function discardPom(id: string, now: Date) {
  return update(
    `UPDATE pom_sessions SET discarded_at = ?
     WHERE id = ? AND discarded_at IS NULL AND interrupted_at IS NULL`,
    now.toISOString(),
    id,
  );
}

export function interruptPom(id: string, note: string, now: Date) {
  return update(
    `UPDATE pom_sessions SET interrupted_at = ?, interruption_note = ?
     WHERE id = ? AND discarded_at IS NULL AND interrupted_at IS NULL`,
    now.toISOString(),
    note,
    id,
  );
}

/** Valorar o corregir la valoración. Solo bloques ya terminados (la base impide descartados e interrumpidos). */
export function ratePom(id: string, rating: number, note: string | null, now: Date) {
  return update(
    `UPDATE pom_sessions SET rating = ?, rating_note = ?, rated_at = ?
     WHERE id = ? AND ends_at <= ?`,
    rating,
    note,
    now.toISOString(),
    id,
    now.toISOString(),
  );
}

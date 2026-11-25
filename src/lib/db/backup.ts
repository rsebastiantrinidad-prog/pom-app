import "server-only";
import { toCsv } from "@/lib/backup";
import { getDb } from "./index";

/** Todas las tablas de la app, completas (PER-111). */
export const BACKUP_TABLES = ["pom_sessions", "sleep_sessions", "phone_usage", "app_settings"] as const;

/** Cada tabla como CSV, con todas sus columnas y registros, en orden de creación. */
export async function exportTablesCsv(): Promise<{ name: string; csv: string }[]> {
  const db = await getDb();
  const results = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      // Nombres de tabla fijos (no vienen del usuario).
      const [columns, ...rows] = await db
        .prepare(`SELECT * FROM ${table} ORDER BY rowid`)
        .raw<(string | number | null)[]>({ columnNames: true });
      const cols = (columns as unknown as string[] | undefined) ?? (await columnNames(table));
      return { name: `${table}.csv`, csv: toCsv(cols, rows) };
    }),
  );
  return results;
}

/** Columnas de una tabla vacía (raw no devuelve encabezados si no hay filas). */
async function columnNames(table: string): Promise<string[]> {
  const db = await getDb();
  const { results } = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return results.map((r) => r.name);
}

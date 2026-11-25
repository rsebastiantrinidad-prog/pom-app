import type { PhoneApp } from "./types";

export const MAX_PHONE_APPS = 30;
const MAX_NAME = 40;

/**
 * Lee `phone_apps` tal como está guardado. Acepta el formato viejo (lista de
 * nombres) y el nuevo (objetos), así la app no se rompe si falta la migración 0003.
 */
export function normalizePhoneApps(raw: unknown): PhoneApp[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): PhoneApp[] => {
    if (typeof item === "string") return [{ id: item, name: item, hidden: false }];
    if (item && typeof item === "object" && typeof item.name === "string") {
      return [{ id: String(item.id ?? item.name), name: item.name, hidden: item.hidden === true }];
    }
    return [];
  });
}

export type PhoneAppsResult =
  | { ok: true; apps: PhoneApp[]; renames: { from: string; to: string }[] }
  | { ok: false; error: string };

/**
 * Valida la lista editada (PER-97) contra la guardada. Las apps no se borran:
 * solo se ocultan, así sus registros siguen ahí. Renombrar devuelve el cambio
 * para actualizar también los registros históricos.
 */
export function validatePhoneApps(input: unknown, previous: PhoneApp[]): PhoneAppsResult {
  if (!Array.isArray(input)) return { ok: false, error: "Lista de apps inválida." };
  if (input.length > MAX_PHONE_APPS) return { ok: false, error: `Máximo ${MAX_PHONE_APPS} apps.` };

  const apps: PhoneApp[] = [];
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of input) {
    if (!item || typeof item !== "object") return { ok: false, error: "Lista de apps inválida." };
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim().replace(/\s+/g, " ") : "";
    if (!id || id.length > 64) return { ok: false, error: "Lista de apps inválida." };
    if (!name) return { ok: false, error: "Cada app necesita un nombre." };
    if (name.length > MAX_NAME) return { ok: false, error: `El nombre "${name.slice(0, 20)}…" es muy largo.` };
    const key = name.toLocaleLowerCase("es");
    if (seenNames.has(key)) return { ok: false, error: `"${name}" está repetida.` };
    if (seenIds.has(id)) return { ok: false, error: "Lista de apps inválida." };
    seenNames.add(key);
    seenIds.add(id);
    apps.push({ id, name, hidden: item.hidden === true });
  }

  const byId = new Map(apps.map((a) => [a.id, a]));
  const missing = previous.find((p) => !byId.has(p.id));
  if (missing) return { ok: false, error: `No se puede quitar "${missing.name}": ocultala en su lugar.` };

  const renames = previous
    .filter((p) => byId.get(p.id)!.name !== p.name)
    .map((p) => ({ from: p.name, to: byId.get(p.id)!.name }));
  return { ok: true, apps, renames };
}

/** Horas y minutos tipeados → minutos (0–1440). Null si es inválido. Vacío en ambos = undefined (sin dato). */
export function parseHoursMinutes(hours: string, minutes: string): number | null | undefined {
  const h = hours.trim();
  const m = minutes.trim();
  if (!h && !m) return undefined;
  if ((h && !/^\d{1,2}$/.test(h)) || (m && !/^\d{1,4}$/.test(m))) return null;
  const total = Number(h || 0) * 60 + Number(m || 0);
  return total <= 1440 ? total : null;
}

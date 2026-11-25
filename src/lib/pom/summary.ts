import { addPomDays, type PomDay } from "./day";
import { getPomStatus } from "./session";
import { sleepMinutes } from "./sleep";
import { SECTORS, type PhoneUsage, type PomSession, type Sector, type SleepSession } from "./types";

/**
 * Resumen de un día PoM (PER-98) y su agrupación por semana o mes (PER-110).
 * Lógica pura: recibe las filas ya leídas de la base y no toca la UI.
 *
 * Regla de "sin dato": si un día no tiene sueño o uso del móvil cargado, el valor
 * es `null` (no cero), así los gráficos lo muestran vacío.
 */

export type PerSector<T> = Record<Sector, T>;

export interface InterruptionNote {
  id: string;
  pom_day: PomDay;
  sector: Sector;
  objective: string;
  started_at: string;
  note: string;
}

export interface DaySummary {
  day: PomDay;
  completed: PerSector<number>;
  completedTotal: number;
  interrupted: PerSector<number>;
  interruptedTotal: number;
  /** Suma y cantidad de valoraciones, para poder promediar al agrupar. */
  ratingSum: PerSector<number>;
  ratedCount: PerSector<number>;
  /** Minutos de sueño, o null si ese día no se registró sueño. */
  sleepMinutes: number | null;
  /** Uso del móvil por app (minutos), o null si ese día no se cargó. */
  phone: { app: string; minutes: number }[] | null;
  phoneTotal: number | null;
  interruptions: InterruptionNote[];
}

const perSector = <T>(value: () => T): PerSector<T> =>
  Object.fromEntries(SECTORS.map((s) => [s, value()])) as PerSector<T>;

const sum = (r: PerSector<number>) => SECTORS.reduce((a, s) => a + r[s], 0);

/** Promedio de valoración total del día (o de un grupo), null si no hay ninguna. */
export function averageRating(s: Pick<DaySummary, "ratingSum" | "ratedCount">, sector?: Sector): number | null {
  const n = sector ? s.ratedCount[sector] : sum(s.ratedCount);
  if (!n) return null;
  return (sector ? s.ratingSum[sector] : sum(s.ratingSum)) / n;
}

/**
 * Resume un día. Los descartados no cuentan; un bloque en curso tampoco
 * (todavía no está completado).
 */
export function summarizeDay(
  day: PomDay,
  poms: PomSession[],
  sleeps: SleepSession[],
  usage: Pick<PhoneUsage, "app" | "minutes">[],
  now: Date,
): DaySummary {
  const out: DaySummary = {
    day,
    completed: perSector(() => 0),
    completedTotal: 0,
    interrupted: perSector(() => 0),
    interruptedTotal: 0,
    ratingSum: perSector(() => 0),
    ratedCount: perSector(() => 0),
    sleepMinutes: null,
    phone: null,
    phoneTotal: null,
    interruptions: [],
  };

  for (const p of poms) {
    if (p.pom_day !== day) continue;
    const status = getPomStatus(p, now);
    if (status === "completed") {
      out.completed[p.sector]++;
      if (p.rating != null) {
        out.ratingSum[p.sector] += p.rating;
        out.ratedCount[p.sector]++;
      }
    } else if (status === "interrupted") {
      out.interrupted[p.sector]++;
      out.interruptions.push({
        id: p.id,
        pom_day: p.pom_day,
        sector: p.sector,
        objective: p.objective,
        started_at: p.started_at,
        note: p.interruption_note ?? "",
      });
    }
  }
  out.completedTotal = sum(out.completed);
  out.interruptedTotal = sum(out.interrupted);

  const daySleeps = sleeps.filter((s) => s.pom_day === day);
  if (daySleeps.length) out.sleepMinutes = daySleeps.reduce((a, s) => a + sleepMinutes(s, now), 0);

  if (usage.length) {
    out.phone = usage
      .map(({ app, minutes }) => ({ app, minutes }))
      .sort((a, b) => b.minutes - a.minutes || a.app.localeCompare(b.app));
    out.phoneTotal = out.phone.reduce((a, u) => a + u.minutes, 0);
  }
  return out;
}

/** Todos los días PoM de `from` a `to`, ambos incluidos. */
export function daysBetween(from: PomDay, to: PomDay): PomDay[] {
  const out: PomDay[] = [];
  for (let d = from; d <= to; d = addPomDays(d, 1)) out.push(d);
  return out;
}

export type Granularity = "dia" | "semana" | "mes";

/** Un período (día, semana o mes) con los totales de sus días. */
export interface PeriodSummary {
  /** Primer día del período (dentro del rango pedido). */
  key: PomDay;
  from: PomDay;
  to: PomDay;
  days: number;
  completed: PerSector<number>;
  completedTotal: number;
  interrupted: PerSector<number>;
  interruptedTotal: number;
  ratingSum: PerSector<number>;
  ratedCount: PerSector<number>;
  /** Sueño promedio por noche, contando solo los días con dato. Null si ninguno tiene. */
  sleepAvg: number | null;
  sleepDays: number;
  /** Uso del móvil promedio por día, contando solo los días con dato. Null si ninguno tiene. */
  phoneAvg: number | null;
  phoneDays: number;
}

/** Lunes de la semana de un día (las semanas van de lunes a domingo). */
export function weekStart(day: PomDay): PomDay {
  const [y, m, d] = day.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return addPomDays(day, -((dow + 6) % 7));
}

function periodKey(day: PomDay, g: Granularity): string {
  if (g === "semana") return weekStart(day);
  if (g === "mes") return day.slice(0, 7);
  return day;
}

/** Agrupa resúmenes diarios (en orden) por día, semana o mes. */
export function groupSummaries(days: DaySummary[], g: Granularity): PeriodSummary[] {
  const groups = new Map<string, DaySummary[]>();
  for (const d of days) {
    const k = periodKey(d.day, g);
    const list = groups.get(k);
    if (list) list.push(d);
    else groups.set(k, [d]);
  }

  return [...groups.values()].map(combineSummaries);
}

/** Junta varios días (en orden, al menos uno) en un solo período. */
export function combineSummaries(list: DaySummary[]): PeriodSummary {
  const add = (pick: (d: DaySummary) => PerSector<number>) =>
    perSectorFrom((s) => list.reduce((a, d) => a + pick(d)[s], 0));
  const completed = add((d) => d.completed);
  const interrupted = add((d) => d.interrupted);
  const withSleep = list.filter((d) => d.sleepMinutes != null);
  const withPhone = list.filter((d) => d.phoneTotal != null);
  return {
    key: list[0].day,
    from: list[0].day,
    to: list[list.length - 1].day,
    days: list.length,
    completed,
    completedTotal: sum(completed),
    interrupted,
    interruptedTotal: sum(interrupted),
    ratingSum: add((d) => d.ratingSum),
    ratedCount: add((d) => d.ratedCount),
    sleepAvg: withSleep.length
      ? Math.round(withSleep.reduce((a, d) => a + d.sleepMinutes!, 0) / withSleep.length)
      : null,
    sleepDays: withSleep.length,
    phoneAvg: withPhone.length ? Math.round(withPhone.reduce((a, d) => a + d.phoneTotal!, 0) / withPhone.length) : null,
    phoneDays: withPhone.length,
  };
}

function perSectorFrom(value: (s: Sector) => number): PerSector<number> {
  return Object.fromEntries(SECTORS.map((s) => [s, value(s)])) as PerSector<number>;
}

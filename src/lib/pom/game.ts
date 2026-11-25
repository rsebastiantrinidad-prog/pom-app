import { addPomDays, type PomDay } from "./day";
import { getPomStatus } from "./session";
import { sleepMinutes } from "./sleep";
import { weekStart } from "./summary";
import { SECTORS, type PomSession, type ScheduleSlot, type Sector, type SleepSession } from "./types";

/**
 * Gamificación: todo se calcula a partir del historial (no hay tablas nuevas),
 * así nunca se desincroniza. Diseño "sin castigo": los interrumpidos no restan
 * XP y la racha tiene comodines para que un día libre no la corte.
 */

export const XP_PER_POM = 10;
/** Bonus por cada anillo de sector cerrado en un día. */
export const XP_PER_RING = 20;
/** Días sin PoM por semana (lunes a domingo) que no cortan la racha. */
export const FREEZES_PER_WEEK = 2;

type PomLite = Pick<PomSession, "sector" | "pom_day" | "started_at" | "ends_at" | "discarded_at" | "interrupted_at" | "rating">;
type SleepLite = Pick<SleepSession, "pom_day" | "started_at" | "ended_at">;

export interface Ring {
  sector: Sector;
  done: number;
  goal: number;
}

export interface Level {
  level: number;
  xp: number;
  /** XP con la que empezó el nivel actual y la que hace falta para el siguiente. */
  from: number;
  to: number;
}

export interface Streak {
  /** Días con al menos un PoM completado en la racha actual. */
  days: number;
  /** Comodines que quedan esta semana. */
  freezesLeft: number;
  /** Si hoy ya hay un PoM (si no, la racha sigue viva pero falta el de hoy). */
  today: boolean;
  best: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  value: number;
  goal: number;
}

export interface GameStats {
  rings: Ring[];
  level: Level;
  streak: Streak;
  achievements: Achievement[];
  totalPoms: number;
}

/** PoM de referencia por sector según el esquema horario (suma de sus focos del día). */
export function sectorGoals(schedule: ScheduleSlot[]): Record<Sector, number> {
  const goals = { estudio: 0, personal: 0, dbp: 0 } as Record<Sector, number>;
  for (const s of schedule) if (s.sector && s.pom_count) goals[s.sector] += s.pom_count;
  return goals;
}

/** XP acumulada necesaria para llegar al nivel `n` (nivel 1 = 0 XP; cada nivel pide 50 XP más que el anterior). */
export function xpForLevel(n: number): number {
  // Nivel 2: 100, nivel 3: 250, nivel 4: 450…
  return n <= 1 ? 0 : 25 * (n - 1) * (n + 2);
}

export function levelFromXp(xp: number): Level {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return { level, xp, from: xpForLevel(level), to: xpForLevel(level + 1) };
}

export function computeGame(input: {
  poms: PomLite[];
  sleeps: SleepLite[];
  schedule: ScheduleSlot[];
  today: PomDay;
  now: Date;
}): GameStats {
  const { poms, sleeps, schedule, today, now } = input;
  const goals = sectorGoals(schedule);

  // Completados por día y sector.
  const byDay = new Map<PomDay, Record<Sector, number>>();
  const ordered = [...poms].sort((a, b) => a.started_at.localeCompare(b.started_at));
  let total = 0;
  let fiveStars = 0;
  let cleanRun = 0;
  let bestCleanRun = 0;
  for (const p of ordered) {
    const status = getPomStatus(p, now);
    if (status === "completed") {
      total++;
      const d = byDay.get(p.pom_day) ?? { estudio: 0, personal: 0, dbp: 0 };
      d[p.sector]++;
      byDay.set(p.pom_day, d);
      if (p.rating === 5) fiveStars++;
      cleanRun++;
      bestCleanRun = Math.max(bestCleanRun, cleanRun);
    } else if (status === "interrupted") {
      cleanRun = 0;
    }
  }

  // Anillos de hoy.
  const todayCounts = byDay.get(today) ?? { estudio: 0, personal: 0, dbp: 0 };
  const rings = SECTORS.filter((s) => goals[s] > 0).map((s) => ({ sector: s, done: todayCounts[s], goal: goals[s] }));

  // Anillos cerrados en la historia (XP y logros).
  let ringsClosed = 0;
  let fullDays = 0;
  const ringSectors = SECTORS.filter((s) => goals[s] > 0);
  for (const counts of byDay.values()) {
    const closed = ringSectors.filter((s) => counts[s] >= goals[s]).length;
    ringsClosed += closed;
    if (ringSectors.length && closed === ringSectors.length) fullDays++;
  }

  const level = levelFromXp(total * XP_PER_POM + ringsClosed * XP_PER_RING);
  const streak = computeStreak(new Set(byDay.keys()), today);

  // Noches de al menos 7 h (por día PoM).
  const sleepByDay = new Map<PomDay, number>();
  for (const s of sleeps) {
    if (!s.ended_at) continue;
    sleepByDay.set(s.pom_day, (sleepByDay.get(s.pom_day) ?? 0) + sleepMinutes(s, now));
  }
  const goodNights = [...sleepByDay.values()].filter((m) => m >= 7 * 60).length;

  const a = (id: string, title: string, description: string, value: number, goal: number): Achievement => ({
    id,
    title,
    description,
    value: Math.min(value, goal),
    goal,
    unlocked: value >= goal,
  });

  const achievements = [
    a("primer-pom", "Primer bloque", "Completá tu primer PoM.", total, 1),
    a("pom-10", "En marcha", "Completá 10 PoM.", total, 10),
    a("pom-50", "Constancia", "Completá 50 PoM.", total, 50),
    a("pom-100", "Centenario", "Completá 100 PoM.", total, 100),
    a("anillo", "Anillo cerrado", "Llegá a los PoM planificados de un sector en un día.", ringsClosed, 1),
    a("dia-redondo", "Día redondo", "Cerrá todos los anillos el mismo día.", fullDays, 1),
    a("racha-7", "Semana en racha", "Llegá a una racha de 7 días.", streak.best, 7),
    a("racha-30", "Mes en racha", "Llegá a una racha de 30 días.", streak.best, 30),
    a("foco-firme", "Foco firme", "Completá 10 PoM seguidos sin interrumpir ninguno.", bestCleanRun, 10),
    a("cinco-estrellas", "Cinco estrellas", "Valorá 10 PoM con 5 estrellas.", fiveStars, 10),
    a("buen-descanso", "Buen descanso", "Dormí 7 h o más en 5 días.", goodNights, 5),
  ];

  return { rings, level, streak, achievements, totalPoms: total };
}

/**
 * Racha flexible: cuenta los días con al menos un PoM. Un día sin PoM usa un
 * comodín de esa semana (hay 2 por semana); si no quedan, la racha se corta.
 * Hoy nunca la corta: todavía hay tiempo.
 */
export function computeStreak(active: Set<PomDay>, today: PomDay): Streak {
  const days = [...active].filter((d) => d <= today).sort();
  if (!days.length) return { days: 0, freezesLeft: FREEZES_PER_WEEK, today: false, best: 0 };

  const used = new Map<PomDay, number>();
  let streak = 0;
  let best = 0;
  for (let d = days[0]; d <= today; d = addPomDays(d, 1)) {
    if (active.has(d)) {
      streak++;
    } else if (d !== today) {
      const w = weekStart(d);
      const n = used.get(w) ?? 0;
      if (n < FREEZES_PER_WEEK) used.set(w, n + 1);
      else streak = 0;
    }
    best = Math.max(best, streak);
  }
  return {
    days: streak,
    freezesLeft: FREEZES_PER_WEEK - (used.get(weekStart(today)) ?? 0),
    today: active.has(today),
    best,
  };
}

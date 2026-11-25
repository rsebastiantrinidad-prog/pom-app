import { describe, expect, it } from "vitest";
import { computeGame, computeStreak, levelFromXp, sectorGoals, xpForLevel } from "./game";
import { DEFAULT_SETTINGS } from "./defaults";
import type { PomSession } from "./types";

const now = new Date("2026-11-25T15:00:00-03:00");
const today = "2026-11-25";

function pom(day: string, sector: PomSession["sector"], extra: Partial<PomSession> = {}): PomSession {
  return {
    id: Math.random().toString(),
    sector,
    sector_suggested: null,
    objective: "x",
    started_at: `${day}T13:00:00.000Z`,
    ends_at: `${day}T13:40:00.000Z`,
    discarded_at: null,
    rating: null,
    rating_note: null,
    rated_at: null,
    pom_day: day,
    interrupted_at: null,
    interruption_note: null,
    created_at: "",
    ...extra,
  };
}

describe("niveles", () => {
  it("cada nivel pide más XP que el anterior", () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 250, 450]);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toEqual({ level: 2, xp: 100, from: 100, to: 250 });
  });
});

describe("racha flexible", () => {
  const set = (...d: string[]) => new Set(d);

  it("hoy sin PoM no corta la racha", () => {
    expect(computeStreak(set("2026-11-23", "2026-11-24"), today)).toMatchObject({ days: 2, today: false });
  });

  it("un día libre usa un comodín de esa semana", () => {
    // lun 23 activo, mar 24 libre, mié 25 activo
    expect(computeStreak(set("2026-11-23", "2026-11-25"), today)).toMatchObject({ days: 2, freezesLeft: 1, today: true });
  });

  it("tres días libres en la misma semana cortan la racha", () => {
    // lun 16 activo, mar-jue libres (3 > 2 comodines), vie 20 a dom 22 activos
    const s = computeStreak(set("2026-11-16", "2026-11-20", "2026-11-21", "2026-11-22"), "2026-11-22");
    expect(s.days).toBe(3);
    expect(s.best).toBe(3);
  });

  it("los comodines se renuevan cada semana", () => {
    const s = computeStreak(set("2026-11-20", "2026-11-23"), "2026-11-23"); // vie, (sáb, dom libres), lun
    expect(s).toMatchObject({ days: 2, freezesLeft: 2 });
  });
});

describe("anillos, XP y logros", () => {
  const goals = sectorGoals(DEFAULT_SETTINGS.schedule);

  it("las metas salen del esquema horario", () => {
    expect(goals).toEqual({ estudio: 2, personal: 4, dbp: 8 });
  });

  it("calcula anillos de hoy, XP con bonus y logros", () => {
    const poms = [
      pom(today, "estudio", { rating: 5 }),
      pom(today, "estudio"),
      pom(today, "dbp"),
      pom(today, "dbp", { interrupted_at: `${today}T13:10:00.000Z`, interruption_note: "x" }),
      pom("2026-11-24", "personal", { discarded_at: "2026-11-24T13:01:00.000Z" }),
    ];
    const g = computeGame({ poms, sleeps: [], schedule: DEFAULT_SETTINGS.schedule, today, now });
    expect(g.rings).toEqual([
      { sector: "estudio", done: 2, goal: 2 },
      { sector: "personal", done: 0, goal: 4 },
      { sector: "dbp", done: 1, goal: 8 },
    ]);
    expect(g.totalPoms).toBe(3);
    expect(g.level.xp).toBe(3 * 10 + 20); // 3 PoM + 1 anillo cerrado
    const byId = Object.fromEntries(g.achievements.map((x) => [x.id, x]));
    expect(byId["primer-pom"].unlocked).toBe(true);
    expect(byId["anillo"].unlocked).toBe(true);
    expect(byId["dia-redondo"].unlocked).toBe(false);
    expect(byId["pom-10"]).toMatchObject({ value: 3, goal: 10, unlocked: false });
  });

  it("cuenta noches de 7 h o más", () => {
    const sleeps = [
      { pom_day: "2026-11-24", started_at: "2026-11-25T04:00:00.000Z", ended_at: "2026-11-25T11:30:00.000Z" },
      { pom_day: "2026-11-23", started_at: "2026-11-24T04:00:00.000Z", ended_at: "2026-11-24T09:00:00.000Z" },
    ];
    const g = computeGame({ poms: [], sleeps, schedule: [], today, now });
    expect(g.achievements.find((x) => x.id === "buen-descanso")?.value).toBe(1);
  });
});


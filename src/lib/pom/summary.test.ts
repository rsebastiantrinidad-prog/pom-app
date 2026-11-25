import { describe, expect, it } from "vitest";
import { averageRating, daysBetween, groupSummaries, summarizeDay, weekStart } from "./summary";
import type { PomSession, SleepSession } from "./types";

const now = new Date("2026-11-25T15:00:00-03:00");

let n = 0;
function pom(p: Partial<PomSession>): PomSession {
  n++;
  return {
    id: `p${n}`,
    sector: "dbp",
    sector_suggested: null,
    objective: `obj ${n}`,
    started_at: "2026-11-24T18:00:00.000Z",
    ends_at: "2026-11-24T18:40:00.000Z",
    discarded_at: null,
    rating: null,
    rating_note: null,
    rated_at: null,
    pom_day: "2026-11-24",
    interrupted_at: null,
    interruption_note: null,
    created_at: "2026-11-24T18:00:00.000Z",
    ...p,
  };
}

const sleep = (s: Partial<SleepSession>): SleepSession => ({
  id: "s",
  started_at: "2026-11-25T04:30:00.000Z",
  ended_at: "2026-11-25T11:45:00.000Z",
  pom_day: "2026-11-24",
  created_at: "",
  ...s,
});

describe("resumen del día (PER-98)", () => {
  const poms = [
    pom({ sector: "dbp", rating: 4 }),
    pom({ sector: "dbp", rating: 2 }),
    pom({ sector: "personal" }),
    pom({ sector: "estudio", interrupted_at: "2026-11-24T18:10:00.000Z", interruption_note: "llamada" }),
    pom({ sector: "dbp", discarded_at: "2026-11-24T18:01:00.000Z" }),
    pom({ sector: "dbp", pom_day: "2026-11-23", rating: 5 }),
  ];
  const s = summarizeDay(
    "2026-11-24",
    poms,
    [sleep({})],
    [
      { app: "X", minutes: 30 },
      { app: "TikTok", minutes: 90 },
    ],
    now,
  );

  it("cuenta completados por sector, sin descartados ni otros días", () => {
    expect(s.completed).toEqual({ estudio: 0, personal: 1, dbp: 2 });
    expect(s.completedTotal).toBe(3);
  });

  it("cuenta interrumpidos por sector y guarda la observación", () => {
    expect(s.interrupted).toEqual({ estudio: 1, personal: 0, dbp: 0 });
    expect(s.interruptions[0]).toMatchObject({ sector: "estudio", note: "llamada" });
  });

  it("promedia la valoración total y por sector", () => {
    expect(averageRating(s)).toBe(3);
    expect(averageRating(s, "dbp")).toBe(3);
    expect(averageRating(s, "personal")).toBeNull();
  });

  it("suma sueño y uso del móvil (ordenado de mayor a menor)", () => {
    expect(s.sleepMinutes).toBe(435);
    expect(s.phoneTotal).toBe(120);
    expect(s.phone?.[0].app).toBe("TikTok");
  });

  it("un día sin sueño ni móvil devuelve sin dato (null), no cero", () => {
    const empty = summarizeDay("2026-11-22", poms, [sleep({})], [], now);
    expect(empty.sleepMinutes).toBeNull();
    expect(empty.phone).toBeNull();
    expect(empty.phoneTotal).toBeNull();
    expect(averageRating(empty)).toBeNull();
  });

  it("un bloque en curso no cuenta como completado", () => {
    const running = pom({
      pom_day: "2026-11-25",
      started_at: "2026-11-25T17:50:00.000Z",
      ends_at: "2026-11-25T18:30:00.000Z",
    });
    expect(summarizeDay("2026-11-25", [running], [], [], now).completedTotal).toBe(0);
  });
});

describe("agrupación (PER-110)", () => {
  it("las semanas empiezan el lunes", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23"); // miércoles → lunes
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-29")).toBe("2026-11-23"); // domingo
  });

  it("lista los días de un rango", () => {
    expect(daysBetween("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });

  it("agrupa por semana sumando PoM y promediando sueño solo de los días con dato", () => {
    const days = daysBetween("2026-11-22", "2026-11-24").map((day) =>
      summarizeDay(
        day,
        [pom({ pom_day: day, rating: day === "2026-11-24" ? 5 : null })],
        day === "2026-11-22" ? [] : [sleep({ pom_day: day })],
        [],
        now,
      ),
    );
    const [w1, w2] = groupSummaries(days, "semana");
    expect(w1).toMatchObject({
      from: "2026-11-22",
      to: "2026-11-22",
      completedTotal: 1,
      sleepAvg: null,
      phoneAvg: null,
    });
    expect(w2).toMatchObject({
      from: "2026-11-23",
      to: "2026-11-24",
      days: 2,
      completedTotal: 2,
      sleepAvg: 435,
      sleepDays: 2,
    });
    expect(averageRating(w2)).toBe(5);
  });

  it("agrupa por mes", () => {
    const days = daysBetween("2026-11-30", "2026-12-01").map((d) => summarizeDay(d, [], [], [], now));
    expect(groupSummaries(days, "mes").map((g) => g.from)).toEqual(["2026-11-30", "2026-12-01"]);
  });
});

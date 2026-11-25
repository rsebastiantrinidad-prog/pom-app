import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { getSlotProgress, validateSchedule } from "./schedule";

const schedule = DEFAULT_SETTINGS.schedule;
// Córdoba = UTC-3: 18:00Z son las 15:00 locales.
const pom = (startUtc: string, extra: Partial<{ sector: "dbp" | "personal" | "estudio"; discarded_at: string; interrupted_at: string }> = {}) => {
  const started = new Date(startUtc);
  return {
    sector: extra.sector ?? "dbp",
    started_at: started.toISOString(),
    ends_at: new Date(started.getTime() + 40 * 60_000).toISOString(),
    discarded_at: extra.discarded_at ?? null,
    interrupted_at: extra.interrupted_at ?? null,
  };
};

describe("getSlotProgress (PER-90)", () => {
  it("sin PoM previos propone el bloque 1 de 8 con su pista", () => {
    const p = getSlotProgress(schedule, [], new Date("2026-11-24T19:00:00.000Z"));
    expect(p?.slot.sector).toBe("dbp");
    expect(p?.blockNumber).toBe(1);
    expect(p?.total).toBe(8);
    expect(p?.hint).toBe("Seguimiento y checklist");
  });

  it("cuenta solo los completados del sector dentro de la franja", () => {
    const today = [
      pom("2026-11-24T18:00:00.000Z"), // 15:00 dbp completado
      pom("2026-11-24T18:50:00.000Z"), // 15:50 dbp completado
      pom("2026-11-24T19:40:00.000Z", { discarded_at: "2026-11-24T19:41:00.000Z" }),
      pom("2026-11-24T19:45:00.000Z", { interrupted_at: "2026-11-24T20:00:00.000Z" }),
      pom("2026-11-24T14:00:00.000Z"), // 11:00, otra franja
      pom("2026-11-24T18:00:00.000Z", { sector: "personal" }), // otro sector
    ];
    const p = getSlotProgress(schedule, today, new Date("2026-11-24T21:00:00.000Z"));
    expect(p?.blockNumber).toBe(3);
    expect(p?.hint).toBe("Creación y ajuste");
  });

  it("un bloque en curso no suma: sigue siendo su número", () => {
    const p = getSlotProgress(schedule, [pom("2026-11-24T18:00:00.000Z")], new Date("2026-11-24T18:10:00.000Z"));
    expect(p?.blockNumber).toBe(1);
  });

  it("fuera de franja con sector no sugiere nada", () => {
    expect(getSlotProgress(schedule, [], new Date("2026-11-24T12:30:00.000Z"))).toBeNull(); // 09:30
  });

  it("se pueden ocultar las pistas", () => {
    expect(getSlotProgress(schedule, [], new Date("2026-11-24T19:00:00.000Z"), false)?.hint).toBeNull();
  });
});

describe("validateSchedule (PER-89)", () => {
  it("acepta el esquema por defecto", () => {
    expect(validateSchedule(schedule)).toEqual({ ok: true, schedule });
  });

  it("ordena las franjas por hora de inicio", () => {
    const res = validateSchedule([schedule[3], schedule[0]]);
    expect(res.ok && res.schedule.map((s) => s.start)).toEqual(["00:00", "10:00"]);
  });

  it("rechaza superposiciones, fin antes del inicio y horas mal escritas", () => {
    const base = { label: "A", sector: null, pom_count: null };
    expect(validateSchedule([{ ...base, start: "10:00", end: "12:00" }, { ...base, label: "B", start: "11:00", end: "13:00" }]).ok).toBe(false);
    expect(validateSchedule([{ ...base, start: "22:00", end: "02:00" }]).ok).toBe(false);
    expect(validateSchedule([{ ...base, start: "9:00", end: "10:00" }]).ok).toBe(false);
    expect(validateSchedule([{ ...base, start: "22:00", end: "24:00" }]).ok).toBe(true);
  });

  it("rechaza sector inválido y cantidad fuera de rango; descarta pistas vacías", () => {
    const base = { start: "10:00", end: "11:00", label: "A" };
    expect(validateSchedule([{ ...base, sector: "otro", pom_count: null }]).ok).toBe(false);
    expect(validateSchedule([{ ...base, sector: "dbp", pom_count: 0 }]).ok).toBe(false);
    const res = validateSchedule([{ ...base, sector: "dbp", pom_count: 2, focus_hints: { "1": " Revisar ", "2": "  " } }]);
    expect(res.ok && res.schedule[0].focus_hints).toEqual({ "1": "Revisar" });
  });
});

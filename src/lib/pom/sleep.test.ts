import { describe, expect, it } from "vitest";
import { fromLocalInput, getPomDay, toLocalInput } from "./day";
import { formatDuration, isForgotten, sleepMinutes, totalSleepMinutes, validateSleepRange } from "./sleep";

const at = (iso: string) => new Date(iso);
const now = at("2026-11-25T15:00:00-03:00");

describe("sueño (PER-94/95)", () => {
  const night = { started_at: "2026-11-25T04:30:00.000Z", ended_at: "2026-11-25T11:45:00.000Z" }; // 01:30 → 08:45
  const nap = { started_at: "2026-11-25T17:00:00.000Z", ended_at: "2026-11-25T17:40:00.000Z" };

  it("la noche que empieza 01:30 pertenece al día PoM anterior", () => {
    expect(getPomDay(new Date(night.started_at))).toBe("2026-11-24");
  });

  it("suma noche + siesta", () => {
    expect(sleepMinutes(night, now)).toBe(435);
    expect(totalSleepMinutes([night, nap], now)).toBe(475);
  });

  it("una sesión abierta cuenta hasta ahora", () => {
    expect(sleepMinutes({ started_at: "2026-11-25T17:00:00.000Z", ended_at: null }, now)).toBe(60);
  });

  it("formatea duraciones", () => {
    expect(formatDuration(445)).toBe("7 h 25 min");
    expect(formatDuration(40)).toBe("40 min");
    expect(formatDuration(120)).toBe("2 h");
  });

  it("detecta una sesión olvidada", () => {
    expect(isForgotten({ started_at: "2026-11-24T20:00:00.000Z", ended_at: null }, now)).toBe(true);
    expect(isForgotten({ started_at: "2026-11-25T10:00:00.000Z", ended_at: null }, now)).toBe(false);
  });

  it("valida rangos", () => {
    const s = at("2026-11-25T01:00:00-03:00");
    expect(validateSleepRange(s, at("2026-11-25T08:00:00-03:00"), [], now).ok).toBe(true);
    expect(validateSleepRange(s, s, [], now).ok).toBe(false);
    expect(validateSleepRange(s, at("2026-11-25T16:00:00-03:00"), [], now).ok).toBe(false); // futuro
    expect(validateSleepRange(at("2026-11-23T01:00:00-03:00"), at("2026-11-24T08:00:00-03:00"), [], now).ok).toBe(false); // > 24 h
    expect(validateSleepRange(at("2026-11-25T08:00:00-03:00"), at("2026-11-25T09:00:00-03:00"), [night], now).ok).toBe(false); // superpone
    expect(validateSleepRange(at("2026-11-25T09:00:00-03:00"), at("2026-11-25T10:00:00-03:00"), [night], now).ok).toBe(true);
  });
});

describe("hora local para inputs", () => {
  it("ida y vuelta en hora de Córdoba", () => {
    const d = at("2026-11-25T01:30:00-03:00");
    expect(toLocalInput(d)).toBe("2026-11-25T01:30");
    expect(fromLocalInput("2026-11-25T01:30")?.toISOString()).toBe(d.toISOString());
  });

  it("rechaza fechas imposibles", () => {
    expect(fromLocalInput("2026-02-31T10:00")).toBeNull();
    expect(fromLocalInput("hola")).toBeNull();
  });
});

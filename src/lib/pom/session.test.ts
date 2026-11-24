import { describe, expect, it } from "vitest";
import {
  canDiscard,
  canInterrupt,
  formatCountdown,
  getPomStatus,
  getRemainingMs,
  getWorkedMinutes,
  needsRating,
} from "./session";
import { getSlotAt } from "./schedule";
import { DEFAULT_SETTINGS } from "./defaults";

const base = {
  started_at: "2026-11-24T18:00:00.000Z",
  ends_at: "2026-11-24T18:40:00.000Z",
  discarded_at: null as string | null,
  interrupted_at: null as string | null,
  rating: null as number | null,
};
const at = (hhmmss: string) => new Date(`2026-11-24T${hhmmss}.000Z`);

describe("getPomStatus", () => {
  it("está en curso antes de ends_at", () => {
    expect(getPomStatus(base, at("18:39:59"))).toBe("running");
  });
  it("se completa solo al llegar a ends_at, sin que nadie lo marque", () => {
    expect(getPomStatus(base, at("18:40:00"))).toBe("completed");
    expect(getPomStatus(base, at("23:00:00"))).toBe("completed");
  });
  it("descartado e interrumpido nunca cuentan como completados", () => {
    expect(getPomStatus({ ...base, discarded_at: "2026-11-24T18:01:00.000Z" }, at("20:00:00"))).toBe("discarded");
    expect(getPomStatus({ ...base, interrupted_at: "2026-11-24T18:20:00.000Z" }, at("20:00:00"))).toBe("interrupted");
  });
});

describe("cuenta regresiva", () => {
  it("se calcula como ends_at - ahora, aunque la pantalla haya estado bloqueada", () => {
    expect(getRemainingMs(base, at("18:30:00"))).toBe(10 * 60_000);
    expect(getRemainingMs(base, at("19:00:00"))).toBe(0);
  });
  it("formatea mm:ss redondeando hacia arriba", () => {
    expect(formatCountdown(40 * 60_000)).toBe("40:00");
    expect(formatCountdown(61_500)).toBe("01:02");
    expect(formatCountdown(0)).toBe("00:00");
  });
});

describe("descartar e interrumpir", () => {
  it("descartar solo en los primeros 2 minutos", () => {
    expect(canDiscard(base, at("18:02:00"))).toBe(true);
    expect(canDiscard(base, at("18:02:01"))).toBe(false);
  });
  it("interrumpir solo mientras está en curso", () => {
    expect(canInterrupt(base, at("18:39:00"))).toBe(true);
    expect(canInterrupt(base, at("18:40:00"))).toBe(false);
  });
});

describe("minutos trabajados y valoración", () => {
  it("cuenta hasta la interrupción", () => {
    expect(getWorkedMinutes({ ...base, interrupted_at: "2026-11-24T18:25:30.000Z" }, at("20:00:00"))).toBe(25);
  });
  it("un completado cuenta 40 y uno descartado 0", () => {
    expect(getWorkedMinutes(base, at("20:00:00"))).toBe(40);
    expect(getWorkedMinutes({ ...base, discarded_at: "2026-11-24T18:01:00.000Z" }, at("20:00:00"))).toBe(0);
  });
  it("solo los completados sin valorar quedan pendientes de valorar", () => {
    expect(needsRating(base, at("18:30:00"))).toBe(false);
    expect(needsRating(base, at("18:41:00"))).toBe(true);
    expect(needsRating({ ...base, rating: 4 }, at("18:41:00"))).toBe(false);
    expect(needsRating({ ...base, interrupted_at: "2026-11-24T18:20:00.000Z" }, at("18:41:00"))).toBe(false);
  });
});


describe("getSlotAt", () => {
  const slot = (iso: string) => getSlotAt(DEFAULT_SETTINGS.schedule, new Date(iso))?.sector ?? null;
  it("usa la hora de Córdoba (UTC-3)", () => {
    expect(slot("2026-11-24T18:00:00.000Z")).toBe("dbp"); // 15:00
    expect(slot("2026-11-24T17:59:00.000Z")).toBe("personal"); // 14:59
    expect(slot("2026-11-25T03:30:00.000Z")).toBe("estudio"); // 00:30
    expect(slot("2026-11-24T12:30:00.000Z")).toBe(null); // 09:30 arranque
  });
});

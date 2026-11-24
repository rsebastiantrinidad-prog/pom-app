import { describe, expect, it } from "vitest";
import { addPomDays, getPomDay, getPomDayRange } from "./day";

// Córdoba es UTC-3 todo el año: las horas locales se escriben con offset explícito.
const at = (iso: string) => new Date(iso);

describe("getPomDay", () => {
  it("08:59 pertenece al día anterior", () => {
    expect(getPomDay(at("2026-11-25T08:59:00-03:00"))).toBe("2026-11-24");
  });

  it("09:00 abre el día nuevo", () => {
    expect(getPomDay(at("2026-11-25T09:00:00-03:00"))).toBe("2026-11-25");
  });

  it("medianoche pertenece al día anterior", () => {
    expect(getPomDay(at("2026-11-25T00:00:00-03:00"))).toBe("2026-11-24");
  });

  it("un PoM a las 00:30 del 25/11 pertenece al 24/11", () => {
    expect(getPomDay(at("2026-11-25T00:30:00-03:00"))).toBe("2026-11-24");
  });

  it("23:59 sigue en el mismo día", () => {
    expect(getPomDay(at("2026-11-24T23:59:00-03:00"))).toBe("2026-11-24");
  });

  it("cambio de mes: 01/12 a las 03:00 es del 30/11", () => {
    expect(getPomDay(at("2026-12-01T03:00:00-03:00"))).toBe("2026-11-30");
  });

  it("cambio de año: 01/01 a las 08:00 es del 31/12", () => {
    expect(getPomDay(at("2027-01-01T08:00:00-03:00"))).toBe("2026-12-31");
  });

  it("no depende de la zona horaria del dispositivo (instante en UTC)", () => {
    // 2026-11-25T03:30Z = 00:30 en Córdoba
    expect(getPomDay(at("2026-11-25T03:30:00Z"))).toBe("2026-11-24");
  });

  it("respeta una hora de inicio configurada", () => {
    expect(getPomDay(at("2026-11-25T07:00:00-03:00"), 6)).toBe("2026-11-25");
  });
});

describe("addPomDays", () => {
  it("cruza meses y años", () => {
    expect(addPomDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addPomDays("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("getPomDayRange", () => {
  it("va de 09:00 a 09:00 del día siguiente en Córdoba", () => {
    const { start, end } = getPomDayRange("2026-11-24");
    expect(start.toISOString()).toBe("2026-11-24T12:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-25T12:00:00.000Z");
  });

  it("es coherente con getPomDay en los bordes", () => {
    const { start, end } = getPomDayRange("2026-11-30");
    expect(getPomDay(start)).toBe("2026-11-30");
    expect(getPomDay(new Date(end.getTime() - 1))).toBe("2026-11-30");
    expect(getPomDay(end)).toBe("2026-12-01");
  });
});

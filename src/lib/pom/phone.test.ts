import { describe, expect, it } from "vitest";
import { normalizePhoneApps, parseHoursMinutes, validatePhoneApps } from "./phone";

const prev = normalizePhoneApps(["TikTok", "X", "Chrome", "Instagram"]);

describe("apps del móvil (PER-97)", () => {
  it("acepta el formato viejo y el nuevo", () => {
    expect(prev[0]).toEqual({ id: "TikTok", name: "TikTok", hidden: false });
    expect(normalizePhoneApps([{ id: "a", name: "YouTube", hidden: true }])).toEqual([
      { id: "a", name: "YouTube", hidden: true },
    ]);
  });

  it("agrega, oculta y renombra", () => {
    const next = [
      ...prev.map((a) => (a.id === "X" ? { ...a, name: "X (Twitter)" } : a.id === "Chrome" ? { ...a, hidden: true } : a)),
      { id: "n1", name: "YouTube", hidden: false },
    ];
    const res = validatePhoneApps(next, prev);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.apps).toHaveLength(5);
      expect(res.renames).toEqual([{ from: "X", to: "X (Twitter)" }]);
    }
  });

  it("no deja quitar apps (solo ocultar)", () => {
    expect(validatePhoneApps(prev.slice(1), prev)).toMatchObject({ ok: false });
  });

  it("no deja nombres repetidos ni vacíos", () => {
    expect(validatePhoneApps([...prev, { id: "n", name: "tiktok" }], prev)).toMatchObject({ ok: false });
    expect(validatePhoneApps([...prev, { id: "n", name: "  " }], prev)).toMatchObject({ ok: false });
  });
});

describe("parseHoursMinutes (PER-96)", () => {
  it("convierte horas y minutos", () => {
    expect(parseHoursMinutes("1", "25")).toBe(85);
    expect(parseHoursMinutes("", "40")).toBe(40);
    expect(parseHoursMinutes("0", "0")).toBe(0);
  });
  it("vacío = sin dato; inválido = null", () => {
    expect(parseHoursMinutes("", "")).toBeUndefined();
    expect(parseHoursMinutes("x", "")).toBeNull();
    expect(parseHoursMinutes("25", "0")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { nextQuote, QUOTES } from "./quotes";

describe("frases durante el PoM", () => {
  it("todas tienen texto, autor y fuente", () => {
    for (const q of QUOTES) expect(q.text && q.author && q.source).toBeTruthy();
  });

  it("nunca repite la misma frase seguida", () => {
    expect(nextQuote(3, () => 3 / QUOTES.length)).not.toBe(3);
    expect(nextQuote(null, () => 0)).toBe(0);
  });
});

import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sendPush, vapidJwt } from "./webpush";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const privateJwk = privateKey.export({ format: "jwk" }) as JsonWebKey;
const publicJwk = publicKey.export({ format: "jwk" }) as JsonWebKey;

const fromB64url = (s: string) => Uint8Array.from(Buffer.from(s, "base64url"));

describe("Web Push / VAPID (PER-106)", () => {
  it("firma un JWT ES256 verificable con la clave pública", async () => {
    const jwt = await vapidJwt("https://fcm.googleapis.com", "https://pom.example", privateJwk, 1_000_000_000);
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ typ: "JWT", alg: "ES256" });
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({ aud: "https://fcm.googleapis.com" });
    const key = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      fromB64url(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
    expect(ok).toBe(true);
  });

  it("manda el push vacío con la cabecera VAPID y detecta suscripciones vencidas", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (status: number) =>
      (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(null, { status });
      }) as unknown as typeof fetch;
    const vapid = { publicKey: "PUB", privateJwk, subject: "https://pom.example" };
    expect(await sendPush({ endpoint: "https://fcm.googleapis.com/fcm/send/abc" }, vapid, fake(201))).toBe("ok");
    expect(await sendPush({ endpoint: "https://fcm.googleapis.com/fcm/send/abc" }, vapid, fake(410))).toBe("gone");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^vapid t=.+\..+\..+, k=PUB$/);
    expect(headers.TTL).toBe("600");
  });
});

/**
 * Web Push sin dependencias (PER-106), con WebCrypto (Workers y Node).
 * Se envía un push SIN contenido: el service worker muestra el aviso fijo de
 * "bloque terminado". Así no hace falta cifrar el mensaje; solo firmar con VAPID.
 */

export interface PushTarget {
  endpoint: string;
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const enc = new TextEncoder();

/** Firma un JWT ES256 de VAPID para el origen del servicio de push. */
export async function vapidJwt(audience: string, subject: string, privateJwk: JsonWebKey, now = Date.now()) {
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(
    enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })),
  );
  const unsigned = `${header}.${payload}`;
  // WebCrypto devuelve la firma ECDSA ya en formato r||s (64 bytes), el que pide JWT.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)));
  return `${unsigned}.${b64url(sig)}`;
}

export type PushResult = "ok" | "gone" | "error";

/** Envía un push vacío. "gone" = la suscripción ya no existe (hay que darla de baja). */
export async function sendPush(
  target: PushTarget,
  vapid: { publicKey: string; privateJwk: JsonWebKey; subject: string },
  fetchImpl: typeof fetch = fetch,
): Promise<PushResult> {
  const audience = new URL(target.endpoint).origin;
  const jwt = await vapidJwt(audience, vapid.subject, vapid.privateJwk);
  const res = await fetchImpl(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      TTL: "600",
      Urgency: "high",
      "Content-Length": "0",
    },
  });
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok ? "ok" : "error";
}

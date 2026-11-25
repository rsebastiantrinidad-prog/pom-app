import { DurableObject } from "cloudflare:workers";
import { sendPush } from "../lib/push/webpush";

/**
 * Alarma de fin de bloque (PER-106). Una sola instancia ("main"): guarda la
 * próxima hora de fin y, al llegar, avisa por push de los bloques que
 * terminaron de verdad (no descartados ni interrumpidos). Funciona con el
 * celular bloqueado porque corre en Cloudflare, no en el navegador.
 */

interface AlarmEnv {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_JWK: string;
  VAPID_SUBJECT: string;
}

/** Bloques que terminaron hace poco y todavía no se avisaron. */
const DUE_WINDOW_MS = 15 * 60_000;

export class PomAlarm extends DurableObject<AlarmEnv> {
  /** Programa la alarma para `atMs` (si es antes que la ya programada). */
  async schedule(atMs: number): Promise<void> {
    const current = await this.ctx.storage.getAlarm();
    if (current == null || atMs < current) await this.ctx.storage.setAlarm(atMs);
  }

  /** Envía un aviso de prueba ya mismo a todas las suscripciones. */
  async test(): Promise<{ sent: number; failed: number }> {
    return notifyAll(this.env);
  }

  async alarm(): Promise<void> {
    const now = new Date();
    const iso = now.toISOString();
    const db = this.env.DB;
    const { results: due } = await db
      .prepare(
        `SELECT id FROM pom_sessions
         WHERE notified_at IS NULL AND discarded_at IS NULL AND interrupted_at IS NULL
           AND ends_at <= ? AND ends_at > ?`,
      )
      .bind(iso, new Date(now.getTime() - DUE_WINDOW_MS).toISOString())
      .all<{ id: string }>();

    let claimed = 0;
    for (const { id } of due) {
      // Marca primero: si la alarma se reintenta, no se avisa dos veces.
      const { meta } = await db
        .prepare("UPDATE pom_sessions SET notified_at = ? WHERE id = ? AND notified_at IS NULL")
        .bind(iso, id)
        .run();
      claimed += meta.changes;
    }
    if (claimed) await notifyAll(this.env);

    // Próximo bloque en curso, si lo hay (por ejemplo, si se programaron varios).
    const next = await db
      .prepare(
        `SELECT min(ends_at) AS ends_at FROM pom_sessions
         WHERE notified_at IS NULL AND discarded_at IS NULL AND interrupted_at IS NULL AND ends_at > ?`,
      )
      .bind(iso)
      .first<{ ends_at: string | null }>();
    if (next?.ends_at) await this.ctx.storage.setAlarm(new Date(next.ends_at).getTime());
  }
}

async function notifyAll(env: AlarmEnv): Promise<{ sent: number; failed: number }> {
  const { results: subs } = await env.DB.prepare(
    "SELECT id, endpoint FROM push_subscriptions WHERE disabled_at IS NULL",
  ).all<{ id: string; endpoint: string }>();
  const vapid = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey,
    subject: env.VAPID_SUBJECT,
  };
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        const r = await sendPush({ endpoint: s.endpoint }, vapid);
        if (r === "ok") sent++;
        else {
          failed++;
          if (r === "gone") {
            await env.DB.prepare("UPDATE push_subscriptions SET disabled_at = ? WHERE id = ?")
              .bind(new Date().toISOString(), s.id)
              .run();
          }
        }
      } catch (e) {
        failed++;
        console.error("push", e);
      }
    }),
  );
  return { sent, failed };
}

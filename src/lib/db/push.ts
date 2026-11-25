import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./index";

/** Suscripciones push (PER-106) y la alarma de fin de bloque. */

export async function savePushSubscription(sub: { endpoint: string; p256dh: string | null; auth: string | null }, userAgent: string | null) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth,
         user_agent = excluded.user_agent, disabled_at = NULL`,
    )
    .bind(sub.endpoint, sub.p256dh, sub.auth, userAgent)
    .run();
}

export async function disablePushSubscription(endpoint: string) {
  const db = await getDb();
  await db
    .prepare("UPDATE push_subscriptions SET disabled_at = ? WHERE endpoint = ? AND disabled_at IS NULL")
    .bind(new Date().toISOString(), endpoint)
    .run();
}

async function alarm() {
  const { env } = await getCloudflareContext({ async: true });
  return env.POM_ALARM.get(env.POM_ALARM.idFromName("main"));
}

/** Programa el aviso para cuando termina el bloque. Si falla, el PoM sigue igual. */
export async function scheduleEndAlarm(endsAt: Date): Promise<void> {
  try {
    await (await alarm()).schedule(endsAt.getTime());
  } catch (e) {
    console.error("No se pudo programar el aviso push", e);
  }
}

export async function sendTestPush(): Promise<{ sent: number; failed: number }> {
  return (await alarm()).test();
}

export async function getVapidPublicKey(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return env.VAPID_PUBLIC_KEY;
}

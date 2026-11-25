"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { disablePushSubscriptionAction, savePushSubscriptionAction, testPushAction } from "@/app/actions";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

const toKey = (b64url: string) => {
  const b64 = (b64url + "=".repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

/**
 * Avisos push (PER-106): al terminar el bloque llega una notificación aunque el
 * celular esté bloqueado. En Android también vibra en el reloj.
 */
export function PushSettings({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const sub = await (await registration()).pushManager.getSubscription();
        next = sub ? "on" : "off";
      }
      if (alive) setState(next);
    })().catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const enable = () =>
    startTransition(async () => {
      setMsg(null);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      try {
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
        const res = await savePushSubscriptionAction(sub.toJSON(), navigator.userAgent);
        if (!res.ok) throw new Error(res.error);
        setState("on");
        setMsg({ ok: true, text: "Listo: te vamos a avisar al terminar cada bloque." });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "No se pudo activar." });
      }
    });

  const disable = () =>
    startTransition(async () => {
      setMsg(null);
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) {
        await disablePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });

  const test = () =>
    startTransition(async () => {
      setMsg(null);
      const res = await testPushAction();
      setMsg(res.ok ? { ok: true, text: "Aviso enviado: debería llegarte en unos segundos." } : { ok: false, text: res.error });
    });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-bold leading-none">Avisos</h2>
        <p className="text-sm text-muted">
          Una notificación al terminar cada bloque, aunque el celular esté bloqueado. En Android también vibra en tu
          reloj.
        </p>
      </div>

      <div className="card flex flex-col gap-3 p-4">
        {state === "loading" && <p className="text-sm text-muted">Revisando…</p>}
        {state === "unsupported" && (
          <p className="text-sm text-muted">
            Este navegador no permite avisos. Instalá PoM en la pantalla de inicio y abrila desde ahí.
          </p>
        )}
        {state === "denied" && (
          <p className="text-sm text-muted">
            Las notificaciones están bloqueadas para PoM. Activalas en los ajustes del celular (Apps → PoM →
            Notificaciones) y volvé a esta pantalla.
          </p>
        )}
        {state === "off" && (
          <button
            type="button"
            onClick={enable}
            disabled={pending}
            className="press flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-fg disabled:opacity-50"
          >
            <BellRing className="size-5" /> {pending ? "Activando…" : "Activar avisos"}
          </button>
        )}
        {state === "on" && (
          <>
            <p className="flex items-center gap-2 text-sm font-bold text-accent-strong">
              <BellRing className="size-4" /> Avisos activados en este dispositivo
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={test}
                disabled={pending}
                className="press flex items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <Send className="size-4" /> Probar aviso
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={pending}
                className="press flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-muted disabled:opacity-50"
              >
                <BellOff className="size-4" /> Desactivar
              </button>
            </div>
          </>
        )}
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-accent-strong" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}

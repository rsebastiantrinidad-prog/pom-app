"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardPomAction, interruptPomAction } from "@/app/actions";
import { canDiscard, formatCountdown, getRemainingMs, SECTOR_LABELS, type PomSession } from "@/lib/pom";
import { playAlarm, unlockAudio } from "./alarm";

/**
 * Bloque en curso. La cuenta regresiva se recalcula siempre como `ends_at - ahora`
 * (PER-84), así es exacta aunque el celular haya bloqueado la pantalla.
 */
export function PomTimer({ pom, serverNow }: { pom: PomSession; serverNow: number }) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  const [interrupting, setInterrupting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rang = useRef(false);

  const at = new Date(now);
  const remaining = getRemainingMs(pom, at);
  const discardable = canDiscard(pom, at);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 500);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    // Si la página se recargó a mitad del bloque, el primer toque habilita el sonido.
    window.addEventListener("pointerdown", unlockAudio);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", unlockAudio);
    };
  }, []);

  // Al llegar a 0: alarma y recargar los datos (el bloque pasa a completado y se pide la valoración).
  useEffect(() => {
    if (remaining > 0 || rang.current) return;
    rang.current = true;
    if (document.visibilityState === "visible") playAlarm();
    router.refresh();
  }, [remaining, router]);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Algo salió mal.");
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500">{SECTOR_LABELS[pom.sector]}</p>
        <p className="text-lg font-medium">{pom.objective}</p>
      </div>

      <p className="text-center font-mono text-7xl font-semibold tabular-nums" aria-live="off">
        {formatCountdown(remaining)}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {interrupting ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) run(() => interruptPomAction(pom.id, note));
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">¿Qué pasó? (obligatorio)</span>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              className="resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInterrupting(false)}
              className="flex-1 rounded-xl border border-zinc-300 py-2 dark:border-zinc-700"
            >
              Seguir con el bloque
            </button>
            <button
              type="submit"
              disabled={!note.trim() || pending}
              className="flex-1 rounded-xl bg-amber-600 py-2 font-semibold text-white disabled:opacity-40"
            >
              Interrumpir
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          {discardable && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("¿Descartar este bloque? No va a contar en ningún total.")) {
                  run(() => discardPomAction(pom.id));
                }
              }}
              className="rounded-xl px-3 py-2 text-sm text-zinc-500 underline"
            >
              Descartar
            </button>
          )}
          <button
            type="button"
            disabled={pending || remaining === 0}
            onClick={() => setInterrupting(true)}
            className="ml-auto rounded-xl border border-amber-600 px-4 py-2 text-amber-700 dark:text-amber-500"
          >
            Interrumpir
          </button>
        </div>
      )}
    </section>
  );
}

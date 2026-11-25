"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, X } from "lucide-react";
import { discardPomAction, interruptPomAction } from "@/app/actions";
import { canDiscard, formatCountdown, getRemainingMs, type PomSession } from "@/lib/pom";
import { playAlarm, unlockAudio } from "./alarm";
import { Ambient } from "./ambient";
import { RotatingQuote } from "./rotating-quote";
import { SectorTag } from "./sector-tag";

const R = 46; // radio del anillo en un viewBox de 100
const C = 2 * Math.PI * R;

/** Mantiene la pantalla encendida mientras dura el bloque (donde el navegador lo permite). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Sin permiso o sin soporte: el reloj igual funciona.
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, []);
}

/**
 * Modo foco a pantalla completa. La cuenta regresiva se recalcula siempre como
 * `ends_at - ahora` (PER-84), así es exacta aunque el celular bloquee la pantalla.
 */
export function PomTimer({
  pom,
  serverNow,
  hint,
  blockLabel,
}: {
  pom: PomSession;
  serverNow: number;
  hint?: string | null;
  blockLabel?: string | null;
}) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  const [sheet, setSheet] = useState<null | "interrupt" | "discard">(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rang = useRef(false);
  useWakeLock();

  const at = new Date(now);
  const remaining = getRemainingMs(pom, at);
  const discardable = canDiscard(pom, at);
  const total = new Date(pom.ends_at).getTime() - new Date(pom.started_at).getTime();
  const progress = total > 0 ? Math.min(1, 1 - remaining / total) : 1;

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
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
    <section
      aria-label="Bloque en curso"
      data-overlay
      className="fixed inset-0 isolate z-40 flex animate-fade-in flex-col overflow-hidden bg-background"
    >
      <Ambient intensity="focus" />

      {/* Encabezado */}
      <div className="flex animate-fade-up flex-col items-center gap-1 px-6 pt-[max(2rem,env(safe-area-inset-top))] text-center">
        <SectorTag sector={pom.sector} className="text-sm font-bold text-muted" />
        {blockLabel && <p className="font-display text-xl font-bold leading-none text-primary">{blockLabel}</p>}
      </div>

      {/* Reloj */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="relative aspect-square w-[min(84vw,58vh)] animate-breathe">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="pom-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--dbp-teal)" />
                <stop offset="100%" stopColor="var(--dbp-violet)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="2.2" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="url(#pom-ring)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p
              className="font-display text-[min(28vw,19vh)] font-bold leading-none tabular-nums tracking-tight"
              aria-live="off"
            >
              {formatCountdown(remaining)}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              {remaining > 0 ? "restantes" : "¡listo!"}
            </p>
          </div>
        </div>

        <div className="flex max-w-sm animate-fade-up flex-col items-center gap-1 text-center [animation-delay:150ms]">
          <p className="text-xl font-bold leading-snug">{pom.objective}</p>
          {hint && <p className="text-sm font-semibold text-accent-strong">Sugerencia · {hint}</p>}
        </div>
        <RotatingQuote />
      </div>

      {/* Acciones */}
      <div className="flex animate-fade-up items-center justify-center gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] [animation-delay:250ms]">
        {discardable && (
          <button
            type="button"
            onClick={() => setSheet("discard")}
            className="press rounded-full px-4 py-3 text-sm font-semibold text-muted"
          >
            Descartar
          </button>
        )}
        <button
          type="button"
          disabled={remaining === 0}
          onClick={() => setSheet("interrupt")}
          className="press flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 font-bold backdrop-blur-md hover:border-primary"
        >
          <PauseCircle className="size-5 text-primary" />
          Interrumpir
        </button>
      </div>

      {/* Hoja inferior: interrumpir o descartar */}
      {sheet && (
        <div className="absolute inset-0 z-10 flex animate-fade-in items-end bg-black/30 backdrop-blur-sm" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] flex w-[min(100%-2rem,28rem)] animate-sheet flex-col gap-4 border border-line bg-background p-5 shadow-2xl shadow-black/20"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-3xl font-bold leading-none">
                {sheet === "interrupt" ? "¿Qué pasó?" : "¿Descartar el bloque?"}
              </h2>
              <button type="button" onClick={() => setSheet(null)} className="press -m-1 p-1 text-muted" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>

            {sheet === "interrupt" ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (note.trim()) run(() => interruptPomAction(pom.id, note));
                }}
              >
                <p className="text-sm text-muted">
                  El bloque queda guardado como interrumpido, con los minutos trabajados. No cuenta como PoM completado.
                </p>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ej.: me llamaron por una urgencia"
                  className="rounded-xl resize-none border border-line bg-tint px-3 py-2 text-base placeholder:text-muted focus:border-primary focus:outline-none"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={!note.trim() || pending}
                  className="press rounded-2xl bg-primary py-3 font-display text-2xl font-bold text-primary-fg disabled:opacity-35"
                >
                  {pending ? "Guardando…" : "Interrumpir bloque"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Es solo para inicios por error: no va a contar en ningún total. Después de los 2 primeros minutos solo
                  se puede interrumpir.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  disabled={pending || !discardable}
                  onClick={() => run(() => discardPomAction(pom.id))}
                  className="press rounded-2xl bg-primary py-3 font-display text-2xl font-bold text-primary-fg disabled:opacity-35"
                >
                  {pending ? "Descartando…" : "Sí, descartar"}
                </button>
                <button type="button" onClick={() => setSheet(null)} className="press py-2 font-semibold text-muted">
                  Seguir con el bloque
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

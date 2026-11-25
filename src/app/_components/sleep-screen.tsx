"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, Moon, Sun } from "lucide-react";
import { saveSleepAction } from "@/app/actions";
import { formatLocalTime, isForgotten, sleepMinutes, toLocalInput, type SleepSession } from "@/lib/pom";

/**
 * Modo sueño a pantalla completa (PER-94): mientras hay una sesión abierta,
 * la app muestra la noche y un solo botón grande, "Desperté". Si te olvidaste
 * de marcarlo, se puede poner la hora real (PER-95).
 */
export function SleepScreen({ session, serverNow }: { session: SleepSession; serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  const [editing, setEditing] = useState(false);
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 20_000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const at = new Date(now);
  const mins = sleepMinutes(session, at);
  const forgotten = isForgotten(session, at);

  const save = (endValue?: string) => {
    setError(null);
    startTransition(async () => {
      const res = await saveSleepAction(session.id, undefined, endValue);
      if (!res.ok) setError(res.error);
    });
  };

  const openEditor = () => {
    setEnd(toLocalInput(forgotten ? new Date(new Date(session.started_at).getTime() + 8 * 3600_000) : at));
    setEditing(true);
  };

  return (
    <section
      aria-label="Durmiendo"
      data-overlay
      className="fixed inset-0 isolate z-40 flex animate-fade-in flex-col overflow-hidden bg-[#0d0620] text-white"
    >
      {/* Cielo nocturno: luces violetas muy tenues que flotan */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-50">
        <div className="absolute -left-1/3 -top-1/4 size-[80vmax] animate-drift-a rounded-full bg-[radial-gradient(circle,var(--dbp-violet-900)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute -right-1/3 bottom-0 size-[70vmax] animate-drift-b rounded-full bg-[radial-gradient(circle,var(--dbp-violet)_0%,transparent_60%)] opacity-50 blur-3xl" />
        <div className="absolute left-1/4 top-1/3 size-[40vmax] animate-drift-c rounded-full bg-[radial-gradient(circle,var(--dbp-teal-900)_0%,transparent_60%)] blur-3xl" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <Moon className="size-14 animate-breathe text-[var(--dbp-lavender)]" strokeWidth={1.5} />
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Durmiendo desde</p>
          <p className="font-display text-7xl font-bold leading-none tabular-nums">{formatLocalTime(session.started_at)}</p>
          <p className="text-lg font-semibold text-white/70">{formatMinutes(mins)}</p>
        </div>
        {forgotten && !editing && (
          <p className="rounded-xl max-w-xs border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
            Hace más de 14 horas que está abierta. ¿Te olvidaste de marcar “Desperté”? Poné la hora real.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
        {editing ? (
          <form
            className="rounded-2xl flex w-full max-w-sm animate-sheet flex-col gap-3 border border-white/15 bg-white/10 p-4 backdrop-blur-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (end) save(end);
            }}
          >
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-white/80">
              Me desperté a las
              <input
                type="datetime-local"
                value={end}
                min={toLocalInput(new Date(session.started_at))}
                max={toLocalInput(at)}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-base text-white [color-scheme:dark] focus:border-[var(--dbp-teal-200)] focus:outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="press flex-1 py-3 font-semibold text-white/70">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!end || pending}
                className="press rounded-2xl flex-1 bg-white py-3 font-display text-2xl font-bold text-[var(--dbp-violet-900)] disabled:opacity-40"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => (forgotten ? openEditor() : save())}
              className="press rounded-2xl flex w-full max-w-sm items-center justify-center gap-3 bg-gradient-to-r from-[var(--dbp-teal)] to-[var(--dbp-teal-200)] py-4 font-display text-3xl font-bold text-[var(--dbp-violet-900)] shadow-xl shadow-[var(--dbp-teal)]/20 disabled:opacity-50"
            >
              <Sun className="size-7" />
              {pending ? "Guardando…" : "Desperté"}
            </button>
            {!forgotten && (
              <button type="button" onClick={openEditor} className="press flex items-center gap-1.5 py-2 text-sm font-semibold text-white/60">
                <Clock className="size-4" /> Me desperté a otra hora
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
}

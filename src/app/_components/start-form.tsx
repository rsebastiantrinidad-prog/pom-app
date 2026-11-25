"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Sparkles } from "lucide-react";
import { startPomAction } from "@/app/actions";
import { getSlotProgress, SECTOR_LABELS, SECTORS, type PomSession, type ScheduleSlot, type Sector } from "@/lib/pom";
import { unlockAudio } from "./alarm";

type PomLite = Pick<PomSession, "sector" | "started_at" | "ends_at" | "discarded_at" | "interrupted_at">;

const CHIP_ON: Record<Sector, string> = {
  estudio: "bg-sector-estudio text-white border-sector-estudio",
  personal: "bg-sector-personal text-white border-sector-personal",
  dbp: "bg-sector-dbp text-white border-sector-dbp",
};
// Etiquetas con espacios para que corten bien en botones angostos.
const CHIP_LABEL: Record<Sector, string> = {
  estudio: "Estudio / lectura",
  personal: "Tareas personales",
  dbp: "Driven By People",
};
const DOT: Record<Sector, string> = {
  estudio: "bg-sector-estudio",
  personal: "bg-sector-personal",
  dbp: "bg-sector-dbp",
};

/**
 * Iniciar un PoM. El botón no se habilita sin objetivo (PER-83). Propone el
 * sector de la franja actual con su número de bloque y pista de foco
 * (PER-90, PER-93), y se actualiza solo al cambiar de franja. Se puede elegir
 * otro sector siempre (PER-91).
 */
export function StartForm({
  schedule,
  todaysPoms,
  showHints,
  serverNow,
}: {
  schedule: ScheduleSlot[];
  todaysPoms: PomLite[];
  showHints: boolean;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);
  const progress = getSlotProgress(schedule, todaysPoms, new Date(now), showHints);
  const suggested = progress?.slot.sector ?? null;

  const [objective, setObjective] = useState("");
  // null = seguir la sugerencia; un valor = el usuario eligió a mano.
  const [picked, setPicked] = useState<Sector | null>(null);
  const sector = picked ?? suggested;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = objective.trim().length > 0 && sector !== null && !pending;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const done = progress ? progress.blockNumber - 1 : 0;

  return (
    <form
      className="leaf relative flex animate-fade-up flex-col gap-5 border border-line bg-background/70 p-5 shadow-[0_20px_60px_-30px] shadow-primary/40 backdrop-blur-xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || !sector) return;
        unlockAudio();
        setError(null);
        startTransition(async () => {
          const res = await startPomAction(objective, sector);
          if (res.ok) {
            setObjective("");
            setPicked(null);
          } else setError(res.error);
        });
      }}
    >
      {/* Ahora */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Ahora</p>
        {progress ? (
          <>
            <p className="font-display text-4xl font-bold leading-[0.9]">
              {SECTOR_LABELS[progress.slot.sector!]}
              <span className="text-primary">
                {" "}
                · bloque {progress.blockNumber}
                {progress.total ? `/${progress.total}` : ""}
              </span>
            </p>
            {progress.total ? (
              <div className="flex gap-1.5" aria-label={`${done} de ${progress.total} completados`}>
                {Array.from({ length: progress.total }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-700 ${
                      i < done ? DOT[progress.slot.sector!] : i === done ? "bg-primary/30 animate-pulse" : "bg-line"
                    }`}
                  />
                ))}
              </div>
            ) : null}
            {progress.total && progress.blockNumber > progress.total && (
              <p className="text-sm text-muted">Completaste los {progress.total} de referencia: este es extra.</p>
            )}
            {progress.hint && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
                <Sparkles className="size-4" /> Foco sugerido · {progress.hint}
              </p>
            )}
          </>
        ) : (
          <p className="font-display text-4xl font-bold leading-[0.9]">Fuera de franja</p>
        )}
      </div>

      {/* Sector */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">{suggested ? "Sector" : "Elegí un sector"}</legend>
        <div className="grid grid-cols-3 gap-2">
          {SECTORS.map((s) => {
            const on = sector === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(s)}
                className={`press leaf-sm relative border px-2 py-2.5 text-sm font-bold leading-tight ${
                  on ? CHIP_ON[s] + " shadow-lg shadow-black/10" : "border-line bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {CHIP_LABEL[s]}
                {s === suggested && (
                  <span
                    className={`absolute -top-2 right-2 rounded-full px-1.5 text-[10px] font-bold uppercase tracking-wide ${
                      on ? "bg-background text-primary" : "bg-primary text-primary-fg"
                    }`}
                  >
                    sugerido
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Objetivo */}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold">Objetivo del bloque</span>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="¿Qué vas a lograr en estos 40 minutos?"
          className="leaf-sm resize-none border border-line bg-tint px-3 py-2.5 text-base transition-colors placeholder:text-muted focus:border-primary focus:bg-background focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!ready}
        className="press leaf group flex items-center justify-center gap-3 bg-gradient-to-r from-[var(--dbp-violet)] to-[var(--dbp-indigo)] py-4 font-display text-3xl font-bold tracking-wide text-white shadow-xl shadow-primary/30 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
      >
        <Play className="size-6 fill-current transition-transform duration-500 group-enabled:group-hover:translate-x-0.5" />
        {pending ? "Iniciando…" : "Iniciar PoM"}
      </button>
      {!objective.trim() && <p className="-mt-2 text-center text-xs text-muted">Escribí el objetivo para empezar.</p>}
    </form>
  );
}

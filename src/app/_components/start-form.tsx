"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { startPomAction } from "@/app/actions";
import { getSlotProgress, SECTOR_LABELS, SECTORS, type PomSession, type ScheduleSlot, type Sector } from "@/lib/pom";
import { unlockAudio } from "./alarm";
import { SECTOR_SHORT } from "./charts";

type PomLite = Pick<PomSession, "sector" | "started_at" | "ends_at" | "discarded_at" | "interrupted_at">;

const COLOR: Record<Sector, string> = {
  estudio: "var(--sector-estudio)",
  personal: "var(--sector-personal)",
  dbp: "var(--sector-dbp)",
};

const R = 45;
const C = 2 * Math.PI * R;

/**
 * Pantalla Foco en reposo: un anillo grande con el avance del foco del día actual,
 * el sector sugerido y un solo botón. El objetivo es obligatorio (PER-83); el
 * sector se sugiere según la hora (PER-90, PER-93) y se puede cambiar (PER-91).
 */
export function StartForm({
  schedule,
  todaysPoms,
  showHints,
  serverNow,
  pomMinutes,
}: {
  schedule: ScheduleSlot[];
  todaysPoms: PomLite[];
  showHints: boolean;
  serverNow: number;
  pomMinutes: number;
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
  const total = progress?.total ?? 0;
  const ratio = total ? Math.min(1, done / total) : 0;
  const ringColor = sector ? COLOR[sector] : "var(--line)";

  return (
    <form
      className="flex flex-1 flex-col gap-5"
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
      <div className="flex animate-fade-up flex-col items-center gap-1 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Ahora</p>
        <p className="font-display text-3xl font-bold leading-none">
          {progress ? SECTOR_LABELS[progress.slot.sector!] : "Sin foco del día ahora"}
        </p>
        {progress && (
          <p className="text-sm font-semibold text-muted">
            Bloque {progress.blockNumber}
            {total ? ` de ${total}` : ""}
            {total && progress.blockNumber > total ? " · extra" : ""}
          </p>
        )}
      </div>

      {/* Anillo */}
      <div className="relative mx-auto aspect-square w-[min(64vw,15rem)] animate-fade-up [animation-delay:80ms]">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke={ringColor} strokeOpacity={sector ? 0.18 : 1} strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
            opacity={ratio ? 1 : 0}
            className="transition-[stroke-dashoffset,stroke] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-7xl font-bold leading-none tabular-nums tracking-tight">
            {String(pomMinutes).padStart(2, "0")}:00
          </span>
          <span className="mt-1 text-xs font-semibold text-muted">
            {total ? `${done} de ${total} en este foco` : "minutos de foco"}
          </span>
        </div>
      </div>

      {progress?.hint && (
        <p className="-mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-accent-strong">
          <Sparkles className="size-4" /> {progress.hint}
        </p>
      )}

      <div className="mt-auto flex animate-fade-up flex-col gap-3 [animation-delay:160ms]">
        {/* Sector: control segmentado */}
        <div role="radiogroup" aria-label="Sector" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
          {SECTORS.map((s) => {
            const on = sector === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPicked(s)}
                className={`press relative flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold ${
                  on ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: COLOR[s] }} />
                {SECTOR_SHORT[s]}
                {s === suggested && !on && (
                  <span className="absolute right-1.5 top-1 size-1.5 rounded-full bg-primary" aria-label="sugerido" />
                )}
              </button>
            );
          })}
        </div>

        <label className="sr-only" htmlFor="objective">
          Objetivo del bloque
        </label>
        <input
          id="objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          maxLength={500}
          autoComplete="off"
          enterKeyHint="go"
          placeholder={`¿Qué vas a lograr en ${pomMinutes} minutos?`}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-base shadow-[var(--shadow)] transition-colors placeholder:text-muted focus:border-primary focus:outline-none"
        />

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!ready}
          className="press group flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-3xl font-bold text-primary-fg shadow-lg shadow-primary/25 disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
        >
          {pending ? "Iniciando…" : "Empezar"}
          <ArrowRight className="size-6 transition-transform duration-300 group-enabled:group-hover:translate-x-1" />
        </button>
      </div>
    </form>
  );
}

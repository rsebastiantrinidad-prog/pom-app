"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BarChart3, Moon, Smartphone, Sunrise, X } from "lucide-react";
import { dismissSummaryAction } from "@/app/actions";
import { averageRating, formatDuration, SECTORS, type DaySummary, type PomDay } from "@/lib/pom";
import { SECTOR_SHORT, SectorSwatch } from "./charts";

const stars = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}★`);

/**
 * Resumen matinal (PER-99): la primera vez que se abre la app en un día PoM nuevo,
 * muestra cómo fue el anterior. Al cerrarla no vuelve a aparecer ese día.
 */
export function MorningSummary({ today, summary }: { today: PomDay; summary: DaySummary }) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  if (hidden) return null;

  const close = () => {
    setHidden(true);
    startTransition(async () => {
      await dismissSummaryAction(today);
    });
  };

  const s = summary;
  return (
    <section
      aria-label="Resumen de ayer"
      className="leaf relative flex animate-pop flex-col gap-4 overflow-hidden border border-line bg-background/80 p-5 shadow-xl shadow-primary/15 backdrop-blur"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--dbp-violet)] via-[var(--dbp-indigo)] to-[var(--dbp-teal)]"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            <Sunrise className="size-4 text-accent-strong" /> Buen día
          </span>
          <h2 className="font-display text-4xl font-bold leading-none">Así fue ayer</h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar resumen"
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-primary"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* PoM */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "PoM completados", value: String(s.completedTotal), cls: "text-accent" },
          { label: "Interrumpidos", value: String(s.interruptedTotal), cls: "text-primary" },
          { label: "Valoración", value: stars(averageRating(s)), cls: "text-star" },
        ].map((x) => (
          <div key={x.label} className="leaf-sm flex flex-col gap-1 bg-tint p-3">
            <span className={`font-display text-4xl font-bold leading-none ${x.cls}`}>{x.value}</span>
            <span className="text-[11px] font-semibold leading-tight text-muted">{x.label}</span>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5 text-sm">
        {SECTORS.map((sec) => (
          <li key={sec} className="flex items-center gap-2">
            <SectorSwatch sector={sec} />
            <span className="flex-1 font-semibold">{SECTOR_SHORT[sec]}</span>
            <span className="tabular-nums">
              <b>{s.completed[sec]}</b> PoM
              {s.interrupted[sec] > 0 && <span className="text-muted"> · {s.interrupted[sec]} interr.</span>}
              <span className="text-muted"> · {stars(averageRating(s, sec))}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Sueño y móvil */}
      <div className="grid grid-cols-2 gap-2">
        <div className="leaf-sm flex flex-col gap-1 bg-tint p-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <Moon className="size-3.5" /> Sueño
          </span>
          <span className="font-display text-2xl font-bold leading-none">
            {s.sleepMinutes == null ? <span className="text-muted">sin dato</span> : formatDuration(s.sleepMinutes)}
          </span>
        </div>
        <div className="leaf-sm flex flex-col gap-1 bg-tint p-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <Smartphone className="size-3.5" /> Móvil
          </span>
          {s.phoneTotal == null ? (
            <Link href="/movil" className="font-display text-2xl font-bold leading-none text-primary underline">
              Cargar
            </Link>
          ) : (
            <span className="font-display text-2xl font-bold leading-none">{formatDuration(s.phoneTotal)}</span>
          )}
        </div>
      </div>
      {s.phone && (
        <p className="-mt-2 text-xs text-muted">
          {s.phone
            .filter((u) => u.minutes > 0)
            .map((u) => `${u.app} ${formatDuration(u.minutes)}`)
            .join(" · ")}
        </p>
      )}

      <div className="flex gap-2">
        {s.phoneTotal == null && (
          <Link
            href="/movil"
            className="press leaf-sm flex flex-1 items-center justify-center gap-2 bg-primary py-3 font-bold text-primary-fg"
          >
            <Smartphone className="size-4" /> Cargar uso del móvil
          </Link>
        )}
        <Link
          href="/avance"
          className="press leaf-sm flex flex-1 items-center justify-center gap-2 border border-line py-3 font-bold"
        >
          <BarChart3 className="size-4" /> Ver avance
        </Link>
      </div>
    </section>
  );
}

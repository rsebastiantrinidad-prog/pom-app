"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Moon, Smartphone, Sunrise } from "lucide-react";
import { dismissSummaryAction } from "@/app/actions";
import { averageRating, formatDuration, SECTORS, type DaySummary, type PomDay } from "@/lib/pom";
import { SECTOR_SHORT, SectorSwatch } from "./charts";
import { Sheet } from "./sheet";

const stars = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}★`);

/**
 * Resumen matinal (PER-99): la primera vez que se abre la app en un día PoM
 * nuevo, sube una hoja con cómo fue el anterior. Al cerrarla no vuelve ese día.
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
    <Sheet
      label="Resumen de ayer"
      onClose={close}
      title={
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            <Sunrise className="size-4 text-accent-strong" /> Buen día
          </span>
          <h2 className="font-display text-4xl font-bold leading-none">Así fue ayer</h2>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Completados", value: String(s.completedTotal) },
          { label: "Interrumpidos", value: String(s.interruptedTotal) },
          { label: "Valoración", value: stars(averageRating(s)) },
        ].map((x) => (
          <div key={x.label} className="flex flex-col gap-1 rounded-2xl bg-surface-2 py-3">
            <span className="font-display text-3xl font-bold leading-none">{x.value}</span>
            <span className="text-[11px] font-semibold text-muted">{x.label}</span>
          </div>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {SECTORS.map((sec) => (
          <li key={sec} className="flex items-center gap-2 py-2 text-sm">
            <SectorSwatch sector={sec} className="size-3" />
            <span className="flex-1 font-semibold">{SECTOR_SHORT[sec]}</span>
            <span className="tabular-nums">
              <b>{s.completed[sec]}</b> PoM
              {s.interrupted[sec] > 0 && <span className="text-muted"> · {s.interrupted[sec]} interr.</span>}
              <span className="text-muted"> · {stars(averageRating(s, sec))}</span>
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 py-2 text-sm">
          <Moon className="size-3.5 text-muted" />
          <span className="flex-1 font-semibold">Sueño</span>
          <span className={s.sleepMinutes == null ? "text-muted" : "font-bold"}>
            {s.sleepMinutes == null ? "sin dato" : formatDuration(s.sleepMinutes)}
          </span>
        </li>
        <li className="flex items-center gap-2 py-2 text-sm">
          <Smartphone className="size-3.5 text-muted" />
          <span className="flex-1 font-semibold">Uso del móvil</span>
          <span className={s.phoneTotal == null ? "text-muted" : "font-bold"}>
            {s.phoneTotal == null ? "sin dato" : formatDuration(s.phoneTotal)}
          </span>
        </li>
      </ul>

      <div className="flex gap-2">
        {s.phoneTotal == null && (
          <Link
            href="/movil"
            onClick={close}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-fg"
          >
            <Smartphone className="size-4" /> Cargar móvil
          </Link>
        )}
        <button type="button" onClick={close} className="press flex-1 rounded-2xl bg-surface-2 py-3.5 font-bold">
          Empezar el día
        </button>
      </div>
    </Sheet>
  );
}

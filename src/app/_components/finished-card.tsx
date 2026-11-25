"use client";

import { useState } from "react";
import { PartyPopper, Sparkles } from "lucide-react";
import { XP_PER_POM, type Level, type PomSession } from "@/lib/pom";
import { RatingForm } from "./rating";
import { SectorTag } from "./sector-tag";
import { Sheet } from "./sheet";

/**
 * Bloque terminado (PER-85, PER-109): hoja inferior con la recompensa (+XP) y
 * la valoración. Se puede cerrar y valorar después desde "Hoy".
 */
export function FinishedCard({ pom, level }: { pom: PomSession; level: Level }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const pct = level.to > level.from ? ((level.xp - level.from) / (level.to - level.from)) * 100 : 0;
  return (
    <Sheet
      label="Bloque terminado"
      onClose={() => setHidden(true)}
      title={
        <p className="flex items-center gap-2 font-display text-4xl font-bold leading-none">
          <PartyPopper className="size-7 text-accent-strong" /> ¡Bloque terminado!
        </p>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <span className="grid size-11 shrink-0 animate-pop place-items-center rounded-full bg-gradient-to-br from-[var(--dbp-teal)] to-[var(--dbp-violet)] text-white">
          <Sparkles className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-bold">
            +{XP_PER_POM} XP · Nivel {level.level}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--dbp-teal)] to-[var(--dbp-violet)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <SectorTag sector={pom.sector} className="text-xs font-semibold text-muted" />
        <p className="font-bold leading-snug">{pom.objective}</p>
      </div>
      <p className="text-sm font-semibold">¿Cómo te fue?</p>
      <RatingForm pomId={pom.id} initialRating={null} initialNote={null} onDone={() => setHidden(true)} />
    </Sheet>
  );
}

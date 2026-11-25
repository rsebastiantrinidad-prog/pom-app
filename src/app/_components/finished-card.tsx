"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { type PomSession } from "@/lib/pom";
import { RatingForm } from "./rating";
import { SectorTag } from "./sector-tag";

/** Aparece cuando el último bloque terminó y todavía no se valoró (PER-85 y PER-109). */
export function FinishedCard({ pom }: { pom: PomSession }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <section className="leaf relative flex animate-pop flex-col gap-3 overflow-hidden border border-accent-line bg-accent-soft/80 p-5 backdrop-blur-xl">
      <div aria-hidden className="absolute -right-10 -top-10 size-40 animate-breathe rounded-full bg-accent/20 blur-2xl" />
      <div className="relative flex flex-col gap-1">
        <p className="flex items-center gap-2 font-display text-4xl font-bold leading-none text-accent-strong">
          <PartyPopper className="size-7" /> ¡Bloque terminado!
        </p>
        <SectorTag sector={pom.sector} className="text-sm font-semibold text-muted" />
        <p className="font-bold">{pom.objective}</p>
      </div>
      <p className="relative text-sm font-semibold">¿Cómo te fue?</p>
      <div className="relative">
        <RatingForm pomId={pom.id} initialRating={null} initialNote={null} onDone={() => setHidden(true)} />
      </div>
    </section>
  );
}

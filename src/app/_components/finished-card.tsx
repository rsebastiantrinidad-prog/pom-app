"use client";

import { useState } from "react";
import { SECTOR_LABELS, type PomSession } from "@/lib/pom";
import { RatingForm } from "./rating";

/** Aparece cuando el último bloque terminó y todavía no se valoró (PER-85 y PER-109). */
export function FinishedCard({ pom }: { pom: PomSession }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950">
      <div>
        <p className="text-lg font-semibold">¡Bloque terminado! 🎉</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {SECTOR_LABELS[pom.sector]} · {pom.objective}
        </p>
      </div>
      <p className="text-sm">¿Cómo te fue?</p>
      <RatingForm pomId={pom.id} initialRating={null} initialNote={null} onDone={() => setHidden(true)} />
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { startPomAction } from "@/app/actions";
import { SECTOR_LABELS, SECTORS, type Sector } from "@/lib/pom";
import { unlockAudio } from "./alarm";

/** Iniciar un PoM: el botón no se habilita sin objetivo (PER-83). */
export function StartForm({ suggested, slotLabel }: { suggested: Sector | null; slotLabel: string | null }) {
  const [objective, setObjective] = useState("");
  const [sector, setSector] = useState<Sector | "">(suggested ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = objective.trim().length > 0 && sector !== "" && !pending;

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        unlockAudio();
        setError(null);
        startTransition(async () => {
          const res = await startPomAction(objective, sector);
          if (res.ok) setObjective("");
          else setError(res.error);
        });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Objetivo del bloque</span>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="¿Qué vas a lograr en estos 40 minutos?"
          className="resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          Sector{" "}
          <span className="font-normal text-zinc-500">
            {suggested ? `(sugerido: ${slotLabel})` : "(fuera de franja: elegí uno)"}
          </span>
        </span>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector)}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
        >
          <option value="" disabled>
            Elegí un sector
          </option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {SECTOR_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!ready}
        className="rounded-xl bg-zinc-900 py-3 text-lg font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Iniciando…" : "Iniciar PoM"}
      </button>
    </form>
  );
}

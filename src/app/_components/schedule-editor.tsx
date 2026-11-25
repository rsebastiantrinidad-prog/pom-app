"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveScheduleAction } from "@/app/actions";
import { SECTOR_LABELS, SECTORS, type ScheduleSlot, type Sector } from "@/lib/pom";

const input =
  "rounded-xl border border-line bg-background px-2 py-1.5 text-base focus:border-primary focus:outline-none";

/** Editor del esquema horario (PER-89) y de las pistas de foco (PER-93). */
export function ScheduleEditor({ initial, initialShowHints }: { initial: ScheduleSlot[]; initialShowHints: boolean }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(initial);
  const [showHints, setShowHints] = useState(initialShowHints);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (i: number, patch: Partial<ScheduleSlot>) => {
    setMsg(null);
    setSlots((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveScheduleAction(slots, showHints);
          setMsg(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: res.error });
        });
      }}
    >
      <h2 className="font-display text-3xl font-bold leading-none">Tus ejes del día</h2>

      {slots.map((s, i) => (
        <fieldset
          key={i}
          style={{ "--i": i } as React.CSSProperties}
          className="stagger rounded-2xl flex animate-fade-up flex-col gap-3 border border-line bg-surface p-4 shadow-[var(--shadow)]"
        >
          <div className="flex items-center gap-2">
            <input
              aria-label="Nombre del eje"
              value={s.label}
              onChange={(e) => update(i, { label: e.target.value })}
              maxLength={60}
              className={`${input} min-w-0 flex-1 font-bold`}
            />
            <button
              type="button"
              onClick={() => setSlots((all) => all.filter((_, j) => j !== i))}
              className="press grid size-9 place-items-center rounded-full text-muted hover:text-red-600"
              aria-label="Quitar eje"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              Desde
              <input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Hasta
              <input
                value={s.end}
                onChange={(e) => update(i, { end: e.target.value })}
                placeholder="HH:MM"
                inputMode="numeric"
                pattern="([01]\d|2[0-3]):[0-5]\d|24:00"
                className={input}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              Sector
              <select
                value={s.sector ?? ""}
                onChange={(e) => update(i, { sector: (e.target.value || null) as Sector | null })}
                className={input}
              >
                <option value="">Sin sector (no propone)</option>
                {SECTORS.map((sec) => (
                  <option key={sec} value={sec}>
                    {SECTOR_LABELS[sec]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              PoM planificados
              <input
                type="number"
                min={1}
                max={20}
                value={s.pom_count ?? ""}
                onChange={(e) => update(i, { pom_count: e.target.value ? Number(e.target.value) : null })}
                className={input}
              />
            </label>
          </div>

          {s.sector && s.pom_count ? (
            <details className="text-sm" open={Boolean(s.focus_hints && Object.keys(s.focus_hints).length)}>
              <summary className="cursor-pointer font-bold text-accent-strong">Foco sugerido por bloque</summary>
              <div className="mt-2 flex flex-col gap-1.5">
                {Array.from({ length: s.pom_count }, (_, k) => String(k + 1)).map((n) => (
                  <label key={n} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-muted">Bloque {n}</span>
                    <input
                      value={s.focus_hints?.[n] ?? ""}
                      onChange={(e) => update(i, { focus_hints: { ...s.focus_hints, [n]: e.target.value } })}
                      maxLength={80}
                      placeholder="(sin pista)"
                      className={`${input} min-w-0 flex-1`}
                    />
                  </label>
                ))}
              </div>
            </details>
          ) : null}
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() =>
          setSlots((all) => [...all, { start: "00:00", end: "01:00", label: "Nuevo eje", sector: null, pom_count: null }])
        }
        className="press rounded-xl flex items-center justify-center gap-2 border border-dashed border-primary py-3 font-bold text-primary"
      >
        <Plus className="size-4" /> Agregar eje
      </button>

      <label className="rounded-2xl flex items-center justify-between gap-3 border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <span>
          <span className="block font-bold">Mostrar foco sugerido</span>
          <span className="text-sm text-muted">La pista aparece al iniciar y durante el bloque.</span>
        </span>
        <input
          type="checkbox"
          checked={showHints}
          onChange={(e) => {
            setMsg(null);
            setShowHints(e.target.checked);
          }}
          className="size-6 accent-[var(--primary)]"
        />
      </label>

      {msg && <p className={`text-sm font-bold ${msg.ok ? "text-accent-strong" : "text-red-600"}`}>{msg.text}</p>}

      <button
        type="submit"
        disabled={pending}
        className="press rounded-2xl sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] bg-primary py-4 font-display text-3xl font-bold text-primary-fg shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

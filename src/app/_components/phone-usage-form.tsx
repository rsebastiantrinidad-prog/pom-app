"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { savePhoneUsageAction } from "@/app/actions";
import { formatDuration, parseHoursMinutes, type PomDay } from "@/lib/pom";

type Row = { app: string; hidden: boolean; hours: string; minutes: string };

const field =
  "rounded-xl w-full min-w-0 border border-line bg-tint px-2 py-2 text-center text-lg font-bold tabular-nums focus:border-primary focus:bg-background focus:outline-none";

/**
 * Carga del uso del móvil (PER-96): horas y minutos por app para un día PoM.
 * Un solo valor por día y app; volver a guardar lo reemplaza.
 */
export function PhoneUsageForm({
  day,
  dayLabel,
  prevDay,
  nextDay,
  apps,
  saved,
}: {
  day: PomDay;
  dayLabel: string;
  prevDay: PomDay;
  nextDay: PomDay | null;
  apps: { name: string; hidden: boolean }[];
  saved: Record<string, number>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    apps.map((a) => {
      const m = saved[a.name];
      return {
        app: a.name,
        hidden: a.hidden,
        hours: m === undefined ? "" : String(Math.floor(m / 60)),
        minutes: m === undefined ? "" : String(m % 60),
      };
    }),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = rows.map((r) => parseHoursMinutes(r.hours, r.minutes));
  const total = parsed.reduce<number>((acc, m) => acc + (typeof m === "number" ? m : 0), 0);
  const invalid = parsed.some((m) => m === null);
  const set = (i: number, patch: Partial<Row>) => {
    setMsg(null);
    setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const navBtn = "press grid size-11 place-items-center rounded-full border border-line bg-surface  shadow-[var(--shadow)]";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await savePhoneUsageAction(
            day,
            rows.map(({ app, hours, minutes }) => ({ app, hours, minutes })),
          );
          setMsg(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: res.error });
        });
      }}
    >
      {/* Selector de día */}
      <div className="rounded-2xl flex animate-fade-up items-center justify-between gap-2 border border-line bg-surface p-2 shadow-[var(--shadow)]">
        <Link href={`/movil?dia=${prevDay}`} className={navBtn} aria-label="Día anterior" scroll={false}>
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex flex-col items-center leading-tight">
          <span className="font-display text-3xl font-bold leading-none">{dayLabel}</span>
          <span className="text-xs font-semibold text-muted">Día PoM {day}</span>
        </div>
        {nextDay ? (
          <Link href={`/movil?dia=${nextDay}`} className={navBtn} aria-label="Día siguiente" scroll={false}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </div>

      {/* Total */}
      <div className="rounded-2xl flex animate-fade-up items-end justify-between border border-line bg-gradient-to-br from-[var(--dbp-violet)] to-[var(--dbp-indigo)] p-5 text-white shadow-xl shadow-primary/25 [animation-delay:80ms]">
        <span className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">Total del día</span>
        <span className="font-display text-5xl font-bold leading-none">{formatDuration(total)}</span>
      </div>

      {/* Apps */}
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.app}
            style={{ "--i": i } as React.CSSProperties}
            className="stagger rounded-xl flex animate-fade-up items-center gap-3 border border-line bg-surface p-3 shadow-[var(--shadow)]"
          >
            <span className="min-w-0 flex-1 truncate font-bold">
              {r.app}
              {r.hidden && <span className="ml-2 text-xs font-semibold text-muted">(oculta)</span>}
            </span>
            <label className="flex w-16 flex-col items-center gap-0.5 text-[11px] font-semibold text-muted">
              <input
                inputMode="numeric"
                value={r.hours}
                onChange={(e) => set(i, { hours: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="0"
                aria-label={`Horas de ${r.app}`}
                className={field}
              />
              h
            </label>
            <label className="flex w-16 flex-col items-center gap-0.5 text-[11px] font-semibold text-muted">
              <input
                inputMode="numeric"
                value={r.minutes}
                onChange={(e) => set(i, { minutes: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                placeholder="0"
                aria-label={`Minutos de ${r.app}`}
                className={field}
              />
              min
            </label>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-muted">
        Mirá el tiempo de pantalla del celular y copiá los valores. Lo que dejes vacío queda sin dato.
      </p>
      {invalid && <p className="text-sm font-bold text-red-600">Revisá los valores: el máximo es 24 h por app.</p>}
      {msg && <p className={`text-sm font-bold ${msg.ok ? "text-accent-strong" : "text-red-600"}`}>{msg.text}</p>}

      <button
        type="submit"
        disabled={pending || invalid}
        className="press rounded-2xl sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] bg-primary py-4 font-display text-3xl font-bold text-primary-fg shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

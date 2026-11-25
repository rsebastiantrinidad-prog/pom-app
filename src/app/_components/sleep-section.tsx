"use client";

import { useState, useTransition } from "react";
import { Moon, Pencil } from "lucide-react";
import { saveSleepAction, startSleepAction } from "@/app/actions";
import {
  formatDuration,
  formatLocalTime,
  sleepMinutes,
  toLocalInput,
  totalSleepMinutes,
  type PomDay,
  type SleepSession,
} from "@/lib/pom";

const input =
  "rounded-xl w-full min-w-0 border border-line bg-tint px-2 py-2 text-base focus:border-primary focus:bg-background focus:outline-none";

/**
 * Sueño (PER-94, PER-95): botón "A dormir" y las sesiones de hoy y de ayer
 * (la noche suele pertenecer al día PoM anterior), con su total y corrección.
 */
export function SleepSection({
  days,
  serverNow,
}: {
  days: { day: PomDay; label: string; sessions: SleepSession[] }[];
  serverNow: number;
}) {
  const now = new Date(serverNow);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const withData = days.filter((d) => d.sessions.length);

  return (
    <section className="flex animate-fade-up flex-col gap-3 [animation-delay:180ms]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl font-bold leading-none">Sueño</h2>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await startSleepAction();
              if (!res.ok) setError(res.error);
            });
          }}
          className="press flex items-center gap-2 rounded-full bg-[var(--dbp-violet-900)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-[var(--dbp-lavender)] dark:text-[var(--dbp-violet-900)]"
        >
          <Moon className="size-4" /> {pending ? "…" : "A dormir"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {withData.length === 0 ? (
        <p className="card px-4 py-4 text-sm text-muted">
          Tocá <b className="text-foreground">A dormir</b> al acostarte (o para una siesta) y <b className="text-foreground">Desperté</b> al
          levantarte. Si un día no lo usás, ese día queda sin dato.
        </p>
      ) : (
        withData.map((d) => (
          <div key={d.day} className="card flex flex-col gap-2 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{d.label}</span>
              <span className="font-display text-2xl font-bold leading-none text-primary">
                {formatDuration(totalSleepMinutes(d.sessions, now))}
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {d.sessions.map((s) => (
                <SleepRow key={s.id} session={s} now={now} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function SleepRow({ session, now }: { session: SleepSession; now: Date }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 text-sm">
        <span>
          {formatLocalTime(session.started_at)} → {session.ended_at ? formatLocalTime(session.ended_at) : "ahora"}
          <span className="text-muted"> · {formatDuration(sleepMinutes(session, now))}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setStart(toLocalInput(new Date(session.started_at)));
            setEnd(session.ended_at ? toLocalInput(new Date(session.ended_at)) : "");
            setError(null);
            setEditing(true);
          }}
          className="press grid size-9 place-items-center rounded-full text-muted hover:text-primary"
          aria-label="Corregir horario"
        >
          <Pencil className="size-4" />
        </button>
      </li>
    );
  }

  return (
    <li>
      <form
        className="flex animate-fade-in flex-col gap-2 py-1"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const res = await saveSleepAction(session.id, start, end);
            if (res.ok) setEditing(false);
            else setError(res.error);
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            Me dormí
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={input} required />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            Me desperté
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="press px-3 py-2 text-sm font-semibold text-muted">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || !start}
            className="press rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </li>
  );
}

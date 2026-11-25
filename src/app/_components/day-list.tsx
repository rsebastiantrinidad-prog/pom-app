import { CheckCircle2, CircleDot, PauseCircle } from "lucide-react";
import { formatLocalTime, getPomStatus, getWorkedMinutes, type PomSession, type Sector } from "@/lib/pom";
import { SECTOR_SHORT } from "./charts";
import { RatingInline } from "./rating";

const COLOR: Record<Sector, string> = {
  estudio: "var(--sector-estudio)",
  personal: "var(--sector-personal)",
  dbp: "var(--sector-dbp)",
};

/** PoM del día (PER-88), en una sola tarjeta con separadores. Los descartados no se muestran. */
export function DayList({ poms, now }: { poms: PomSession[]; now: Date }) {
  const visible = poms.filter((p) => getPomStatus(p, now) !== "discarded");
  const completed = visible.filter((p) => getPomStatus(p, now) === "completed");
  const interrupted = visible.length - completed.length - visible.filter((p) => getPomStatus(p, now) === "running").length;
  const rated = completed.filter((p) => p.rating != null);
  const avg = rated.length ? rated.reduce((a, p) => a + (p.rating ?? 0), 0) / rated.length : null;

  return (
    <section className="flex animate-fade-up flex-col gap-3 [animation-delay:120ms]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl font-bold leading-none">Bloques</h2>
        <span className="text-sm font-semibold text-muted">
          {completed.length} {completed.length === 1 ? "completado" : "completados"}
          {interrupted > 0 && ` · ${interrupted} interr.`}
          {avg != null && ` · ${avg.toFixed(1)}★`}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="card px-4 py-6 text-center text-sm text-muted">Todavía no hay bloques hoy. El primero es el que más cuesta.</p>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden">
          {visible
            .slice()
            .reverse()
            .map((p) => {
              const status = getPomStatus(p, now);
              return (
                <li key={p.id} className="flex gap-3 px-4 py-3">
                  <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: COLOR[p.sector] }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="font-bold leading-snug">{p.objective}</p>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      {formatLocalTime(p.started_at)} · {SECTOR_SHORT[p.sector]}
                      {status === "running" && (
                        <span className="flex items-center gap-1 text-accent-strong">
                          · <CircleDot className="size-3 animate-pulse" /> en curso
                        </span>
                      )}
                      {status === "interrupted" && (
                        <span className="flex items-center gap-1 text-primary">
                          · <PauseCircle className="size-3" /> {getWorkedMinutes(p, now)} min
                        </span>
                      )}
                    </p>
                    {status === "interrupted" && <p className="text-sm text-muted">“{p.interruption_note}”</p>}
                    {status === "completed" && <RatingInline pomId={p.id} rating={p.rating} note={p.rating_note} />}
                  </div>
                  {status === "completed" && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent-strong" aria-label="completado" />}
                </li>
              );
            })}
        </ol>
      )}
    </section>
  );
}

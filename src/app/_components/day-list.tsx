import { CheckCircle2, CircleDot, PauseCircle } from "lucide-react";
import { formatLocalTime, getPomStatus, getWorkedMinutes, type PomSession, type Sector } from "@/lib/pom";
import { RatingInline } from "./rating";
import { SectorTag } from "./sector-tag";

const BAR: Record<Sector, string> = {
  estudio: "bg-sector-estudio",
  personal: "bg-sector-personal",
  dbp: "bg-sector-dbp",
};

/** PoM del día (PER-88). Los descartados no se muestran ni cuentan. */
export function DayList({ poms, now }: { poms: PomSession[]; now: Date }) {
  const visible = poms.filter((p) => getPomStatus(p, now) !== "discarded");
  const completedList = visible.filter((p) => getPomStatus(p, now) === "completed");
  const interrupted = visible.filter((p) => getPomStatus(p, now) === "interrupted").length;
  const rated = completedList.filter((p) => p.rating != null);
  const avg = rated.length ? rated.reduce((a, p) => a + (p.rating ?? 0), 0) / rated.length : null;

  const stats = [
    { label: "PoM completados", value: String(completedList.length), cls: "text-accent" },
    { label: "Interrumpidos", value: String(interrupted), cls: "text-primary" },
    { label: "Valoración", value: avg ? avg.toFixed(1) + "★" : "—", cls: "text-star" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="animate-fade-up font-display text-4xl font-bold leading-none">Hoy</h2>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{ "--i": i } as React.CSSProperties}
            className="stagger leaf-sm flex animate-fade-up flex-col gap-1 border border-line bg-background/60 p-3 backdrop-blur"
          >
            <span className={`font-display text-4xl font-bold leading-none ${s.cls}`}>{s.value}</span>
            <span className="text-[11px] font-semibold leading-tight text-muted">{s.label}</span>
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="animate-fade-up py-6 text-center text-sm text-muted">
          Todavía no hay bloques hoy. El primero es el que más cuesta.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {visible
            .slice()
            .reverse()
            .map((p, i) => {
              const status = getPomStatus(p, now);
              return (
                <li
                  key={p.id}
                  style={{ "--i": i + 3 } as React.CSSProperties}
                  className={`stagger leaf-sm relative flex animate-fade-up flex-col gap-1.5 overflow-hidden border py-3 pl-5 pr-4 ${
                    status === "interrupted" ? "border-warn-line bg-warn-soft" : "border-line bg-background/60"
                  }`}
                >
                  <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${BAR[p.sector]}`} />
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted">
                    <span className="flex items-center gap-2">
                      {formatLocalTime(p.started_at)} · <SectorTag sector={p.sector} />
                    </span>
                    {status === "running" && (
                      <span className="flex items-center gap-1 text-accent-strong">
                        <CircleDot className="size-3.5 animate-pulse" /> En curso
                      </span>
                    )}
                    {status === "completed" && (
                      <span className="flex items-center gap-1 text-accent-strong">
                        <CheckCircle2 className="size-3.5" /> 40 min
                      </span>
                    )}
                    {status === "interrupted" && (
                      <span className="flex items-center gap-1 text-primary">
                        <PauseCircle className="size-3.5" /> {getWorkedMinutes(p, now)} min
                      </span>
                    )}
                  </div>
                  <p className="font-bold leading-snug">{p.objective}</p>
                  {status === "interrupted" && <p className="text-sm text-muted">“{p.interruption_note}”</p>}
                  {status === "completed" && <RatingInline pomId={p.id} rating={p.rating} note={p.rating_note} />}
                </li>
              );
            })}
        </ol>
      )}
    </section>
  );
}

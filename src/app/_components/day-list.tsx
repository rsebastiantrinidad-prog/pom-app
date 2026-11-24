import {
  formatLocalTime,
  getPomStatus,
  getWorkedMinutes,
  SECTOR_LABELS,
  type PomSession,
} from "@/lib/pom";
import { RatingInline } from "./rating";

/** PoM del día (PER-88). Los descartados no se muestran ni cuentan. */
export function DayList({ poms, now }: { poms: PomSession[]; now: Date }) {
  const visible = poms.filter((p) => getPomStatus(p, now) !== "discarded");
  const completed = visible.filter((p) => getPomStatus(p, now) === "completed").length;
  const interrupted = visible.filter((p) => getPomStatus(p, now) === "interrupted").length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Hoy</h2>
        <p className="text-sm text-zinc-500">
          <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{completed}</span> PoM
          {interrupted > 0 && ` · ${interrupted} interrumpido${interrupted > 1 ? "s" : ""}`}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay bloques hoy.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => {
            const status = getPomStatus(p, now);
            return (
              <li
                key={p.id}
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${
                  status === "interrupted"
                    ? "border-amber-300 dark:border-amber-800"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>
                    {formatLocalTime(p.started_at)} · {SECTOR_LABELS[p.sector]}
                  </span>
                  {status === "running" && <span className="font-medium text-emerald-600">En curso</span>}
                  {status === "interrupted" && (
                    <span className="font-medium text-amber-700 dark:text-amber-500">
                      Interrumpido · {getWorkedMinutes(p, now)} min
                    </span>
                  )}
                </div>
                <p>{p.objective}</p>
                {status === "interrupted" && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">“{p.interruption_note}”</p>
                )}
                {status === "completed" && <RatingInline pomId={p.id} rating={p.rating} note={p.rating_note} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

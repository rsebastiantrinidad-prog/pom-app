import { Check, Flame, Lock, Snowflake, Trophy } from "lucide-react";
import type { Achievement, Level, Ring, Sector, Streak } from "@/lib/pom";
import { SECTOR_SHORT } from "./charts";

const STROKE: Record<Sector, string> = {
  estudio: "var(--sector-estudio)",
  personal: "var(--sector-personal)",
  dbp: "var(--sector-dbp)",
};

/**
 * Anillos del día (uno por sector): se cierran al llegar a los PoM planificados
 * de sus focos del día. Al lado, la leyenda con los números (no depende del color).
 */
export function DayRings({ rings, size = 132 }: { rings: Ring[]; size?: number }) {
  const width = 9;
  const gap = 3;
  const done = rings.reduce((a, r) => a + r.done, 0);
  const goal = rings.reduce((a, r) => a + r.goal, 0);
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${done} de ${goal} PoM del día`}>
          {rings.map((r, i) => {
            const radius = 50 - width / 2 - i * (width + gap);
            const c = 2 * Math.PI * radius;
            const p = r.goal ? Math.min(1, r.done / r.goal) : 0;
            return (
              <g key={r.sector}>
                <circle cx="50" cy="50" r={radius} fill="none" stroke={STROKE[r.sector]} strokeOpacity="0.16" strokeWidth={width} />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={STROKE[r.sector]}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - p)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                  opacity={p === 0 ? 0 : 1}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-3xl font-bold leading-none tabular-nums">
            {done}
            <span className="text-base text-muted">/{goal}</span>
          </span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
        {rings.map((r) => {
          const closed = r.done >= r.goal;
          return (
            <li key={r.sector} className="flex items-center gap-2 text-sm">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: STROKE[r.sector] }} />
              <span className="flex-1 font-semibold">{SECTOR_SHORT[r.sector]}</span>
              <span className="font-bold tabular-nums">
                {r.done}/{r.goal}
              </span>
              {closed ? (
                <Check className="size-4 text-accent-strong" aria-label="cerrado" />
              ) : (
                <span className="size-4" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Racha y nivel, en dos fichas compactas. */
export function StreakLevel({ streak, level }: { streak: Streak; level: Level }) {
  const pct = level.to > level.from ? ((level.xp - level.from) / (level.to - level.from)) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
          <Flame className={`size-4 ${streak.days ? "text-[#f08a24]" : ""}`} /> Racha
        </span>
        <span className="font-display text-4xl font-bold leading-none">
          {streak.days} <span className="text-lg text-muted">{streak.days === 1 ? "día" : "días"}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
          <Snowflake className="size-3" /> {streak.freezesLeft} {streak.freezesLeft === 1 ? "comodín" : "comodines"} esta semana
        </span>
      </div>
      <div className="card flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
          <Trophy className="size-4 text-primary" /> Nivel
        </span>
        <span className="font-display text-4xl font-bold leading-none">{level.level}</span>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${level.xp} de ${level.to} XP`}>
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--dbp-teal)] to-[var(--dbp-violet)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-muted tabular-nums">
          {level.xp - level.from} / {level.to - level.from} XP
        </span>
      </div>
    </div>
  );
}

/** Grilla de logros: los desbloqueados en color, los otros con su progreso. */
export function Achievements({ items }: { items: Achievement[] }) {
  const unlocked = items.filter((a) => a.unlocked).length;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold leading-none">Logros</h2>
        <span className="text-sm font-bold text-muted tabular-nums">
          {unlocked}/{items.length}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {items.map((a) => (
          <li
            key={a.id}
            className={`card flex flex-col gap-2 p-3.5 ${a.unlocked ? "" : "opacity-75"}`}
          >
            <span
              className={`grid size-10 place-items-center rounded-full ${
                a.unlocked
                  ? "bg-gradient-to-br from-[var(--dbp-teal)] to-[var(--dbp-violet)] text-white"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {a.unlocked ? <Trophy className="size-5" /> : <Lock className="size-4" />}
            </span>
            <span className="font-bold leading-tight">{a.title}</span>
            <span className="text-xs leading-snug text-muted">{a.description}</span>
            {!a.unlocked && a.goal > 1 && (
              <div className="mt-auto flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(a.value / a.goal) * 100}%` }} />
                </div>
                <span className="text-[11px] font-bold text-muted tabular-nums">
                  {a.value}/{a.goal}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

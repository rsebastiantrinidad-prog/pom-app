import { SECTORS, type PerSector, type Sector } from "@/lib/pom";

/**
 * Gráficos de barras horizontales (PER-100, PER-101, PER-110): en el celular se
 * leen mejor que columnas, y cada fila lleva su número escrito, así nada depende
 * solo del color. Los sectores suman textura (rayas, puntos, liso).
 */

export const SECTOR_SHORT: Record<Sector, string> = {
  estudio: "Estudio",
  personal: "Personal",
  dbp: "DBP",
};

const TEX: Record<Sector, string> = {
  estudio: "tex-estudio",
  personal: "tex-personal",
  dbp: "tex-dbp",
};

export function SectorSwatch({ sector, className = "size-3.5" }: { sector: Sector; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-[3px] ${TEX[sector]} ${className}`} />;
}

export function SectorLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
      {SECTORS.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <SectorSwatch sector={s} /> {SECTOR_SHORT[s]}
        </li>
      ))}
    </ul>
  );
}

export interface PomRow {
  key: string;
  label: string;
  completed: PerSector<number>;
  total: number;
  /** Texto extra a la derecha del desglose (ej. valoración promedio). */
  extra?: string | null;
}

/** Barras apiladas de PoM completados por sector. */
export function PomBars({ rows }: { rows: PomRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r) => {
        const parts = SECTORS.filter((s) => r.completed[s] > 0);
        const desc = parts.map((s) => `${r.completed[s]} ${SECTOR_SHORT[s]}`).join(" · ");
        return (
          <li key={r.key} className="grid grid-cols-[3.75rem_1fr_2rem] items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold capitalize leading-tight">{r.label}</span>
            <div
              className="flex h-5 gap-[2px] overflow-hidden rounded-r-[4px] bg-tint"
              role="img"
              aria-label={`${r.label}: ${r.total} PoM${desc ? ` (${desc})` : ""}`}
            >
              {parts.map((s) => (
                <span
                  key={s}
                  title={`${SECTOR_SHORT[s]}: ${r.completed[s]}`}
                  className={`h-full last:rounded-r-[4px] ${TEX[s]}`}
                  style={{ width: `${(r.completed[s] / max) * 100}%` }}
                />
              ))}
            </div>
            <span className="text-right font-display text-2xl font-bold leading-none tabular-nums">{r.total}</span>
            {(desc || r.extra) && (
              <span className="col-start-2 col-end-4 -mt-0.5 text-[11px] font-semibold text-muted">
                {desc}
                {desc && r.extra && " · "}
                {r.extra}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export interface MetricRow {
  key: string;
  label: string;
  /** Minutos, o null si no hay dato. */
  value: number | null;
}

/** Horas por fila con eje en horas. Los días sin dato se ven vacíos (punteados). */
export function HoursBars({
  rows,
  barClass,
  format,
  minScaleHours = 4,
}: {
  rows: MetricRow[];
  barClass: string;
  format: (minutes: number) => string;
  minScaleHours?: number;
}) {
  const maxH = Math.max(minScaleHours, ...rows.map((r) => Math.ceil((r.value ?? 0) / 60)));
  const step = maxH <= 4 ? 1 : maxH <= 8 ? 2 : maxH <= 16 ? 4 : 6;
  const top = Math.ceil(maxH / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[3.75rem_1fr_4.5rem] items-center gap-2">
            <span className="text-sm font-bold capitalize leading-tight">{r.label}</span>
            {r.value == null ? (
              <span
                className="h-4 rounded-r-[4px] border border-dashed border-line"
                aria-label={`${r.label}: sin dato`}
              />
            ) : (
              <span className="relative h-4 bg-tint" role="img" aria-label={`${r.label}: ${format(r.value)}`}>
                <span
                  className={`absolute inset-y-0 left-0 rounded-r-[4px] ${barClass}`}
                  style={{
                    width: `${Math.min(100, (r.value / (top * 60)) * 100)}%`,
                  }}
                />
              </span>
            )}
            <span className={`text-right text-xs font-bold tabular-nums ${r.value == null ? "text-muted" : ""}`}>
              {r.value == null ? "sin dato" : format(r.value)}
            </span>
          </li>
        ))}
      </ol>
      {/* Eje en horas, alineado con la columna de las barras */}
      <div className="grid grid-cols-[3.75rem_1fr_4.5rem] gap-2" aria-hidden>
        <span />
        <div className="relative h-4 border-t border-line">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-muted first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(t / top) * 100}%` }}
            >
              {t} h
            </span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}

/** "7 h 25" — formato corto para las barras. */
export function shortDuration(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (!h) return `${min} min`;
  return min ? `${h} h ${String(min).padStart(2, "0")}` : `${h} h`;
}

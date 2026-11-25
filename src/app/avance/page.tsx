import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PauseCircle } from "lucide-react";
import {
  addPomDays,
  averageRating,
  combineSummaries,
  daysBetween,
  formatLocalTime,
  getPomDay,
  groupSummaries,
  type Granularity,
  type PeriodSummary,
  type PomDay,
} from "@/lib/pom";
import { getSettings } from "@/lib/db";
import { getDaySummaries } from "@/lib/db/summary";
import { Ambient } from "../_components/ambient";
import { AppHeader } from "../_components/app-header";
import { HoursBars, PomBars, SectorLegend, SectorSwatch, SECTOR_SHORT, shortDuration } from "../_components/charts";

export const metadata: Metadata = { title: "Avance · PoM" };

type Params = {
  desde?: string | string[];
  hasta?: string | string[];
  por?: string | string[];
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Más de esto, "por día" se pasa a "por semana" para que la lista no sea eterna. */
const MAX_DAY_ROWS = 62;
const MAX_RANGE_DAYS = 3 * 366;

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const validDay = (v: string | undefined): v is PomDay =>
  !!v &&
  DAY_RE.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

const fmt = (opts: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat("es-AR", { ...opts, timeZone: "UTC" });
  return (day: PomDay) => {
    const [y, m, d] = day.split("-").map(Number);
    return f.format(new Date(Date.UTC(y, m - 1, d))).replace(/\./g, "");
  };
};
const dayLabel = fmt({ weekday: "short", day: "numeric" });
const dayMonth = fmt({ day: "numeric", month: "short" });
const monthLabel = fmt({ month: "short", year: "2-digit" });

function periodLabel(p: PeriodSummary, g: Granularity) {
  if (g === "dia") return dayLabel(p.from);
  if (g === "mes") return monthLabel(p.from);
  return dayMonth(p.from);
}

const stars = (v: number | null) => (v == null ? null : `${v.toFixed(1)}★`);

async function Progress({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const now = new Date();
  const settings = await getSettings();
  const today = getPomDay(now, settings.day_start_hour);
  const sp = await searchParams;

  let to = validDay(one(sp.hasta)) ? (one(sp.hasta) as PomDay) : today;
  let from = validDay(one(sp.desde)) ? (one(sp.desde) as PomDay) : addPomDays(to, -6);
  if (to > today) to = today;
  if (from > to) [from, to] = [to, from];
  if (daysBetween(from, to).length > MAX_RANGE_DAYS) from = addPomDays(to, -(MAX_RANGE_DAYS - 1));

  const requested = one(sp.por);
  let g: Granularity = requested === "semana" || requested === "mes" ? requested : "dia";
  const nDays = daysBetween(from, to).length;
  const switched = g === "dia" && nDays > MAX_DAY_ROWS;
  if (switched) g = "semana";

  const days = await getDaySummaries(from, to, now);
  const periods = groupSummaries(days, g);
  const totals = combineSummaries(days);
  const interruptions = days.flatMap((d) => d.interruptions).reverse();

  const presets: { label: string; days: number; por: Granularity }[] = [
    { label: "7 días", days: 7, por: "dia" },
    { label: "30 días", days: 30, por: "dia" },
    { label: "12 semanas", days: 84, por: "semana" },
    { label: "12 meses", days: 365, por: "mes" },
  ];
  const isActive = (p: (typeof presets)[number]) =>
    to === today && from === addPomDays(today, -(p.days - 1)) && g === p.por;

  const unit = g === "dia" ? "" : g === "semana" ? " por semana" : " por mes";
  const avgNote = g === "dia" ? "" : " (promedio por día con dato)";

  const card = "leaf flex flex-col gap-4 border border-line bg-background/70 p-4 backdrop-blur";
  const chip = "press rounded-full border px-1 py-2 text-center text-xs font-bold whitespace-nowrap";

  return (
    <>
      {/* Rango */}
      <div className="flex animate-fade-up flex-col gap-3">
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={`/avance?desde=${addPomDays(today, -(p.days - 1))}&hasta=${today}&por=${p.por}`}
              className={`${chip} ${isActive(p) ? "border-primary bg-primary text-primary-fg" : "border-line bg-background/70"}`}
              scroll={false}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form
          action="/avance"
          className="leaf-sm grid grid-cols-2 gap-2 border border-line bg-background/60 p-3 backdrop-blur"
        >
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            Desde
            <input
              type="date"
              name="desde"
              defaultValue={from}
              max={today}
              className="leaf-sm min-w-0 border border-line bg-tint px-2 py-2 text-base text-foreground"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            Hasta
            <input
              type="date"
              name="hasta"
              defaultValue={to}
              max={today}
              className="leaf-sm min-w-0 border border-line bg-tint px-2 py-2 text-base text-foreground"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            Ver por
            <select
              name="por"
              defaultValue={g}
              className="leaf-sm min-w-0 border border-line bg-tint px-2 py-2 text-base text-foreground"
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </label>
          <button type="submit" className="press leaf-sm self-end bg-foreground py-2.5 font-bold text-background">
            Ver
          </button>
        </form>
        {switched && <p className="text-xs text-muted">Son muchos días para verlos de a uno: se agrupan por semana.</p>}
      </div>

      {/* Resumen del rango */}
      {
        <div className="grid animate-fade-up grid-cols-3 gap-2 [animation-delay:60ms]">
          {[
            {
              label: "PoM completados",
              value: String(totals.completedTotal),
              cls: "text-accent",
            },
            {
              label: "Interrumpidos",
              value: String(totals.interruptedTotal),
              cls: "text-primary",
            },
            {
              label: "Valoración",
              value: stars(averageRating(totals)) ?? "—",
              cls: "text-star",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="leaf-sm flex flex-col gap-1 border border-line bg-background/60 p-3 backdrop-blur"
            >
              <span className={`font-display text-4xl font-bold leading-none ${s.cls}`}>{s.value}</span>
              <span className="text-[11px] font-semibold leading-tight text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      }

      {/* PER-100: PoM por sector */}
      <section className={`${card} animate-fade-up [animation-delay:120ms]`}>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-bold leading-none">PoM completados{unit}</h2>
          <SectorLegend />
        </div>
        <PomBars
          rows={periods.map((p) => ({
            key: p.key,
            label: periodLabel(p, g),
            completed: p.completed,
            total: p.completedTotal,
            extra: stars(averageRating(p)),
          }))}
        />
      </section>

      {/* PER-101: sueño y móvil de los mismos días */}
      <section className={`${card} animate-fade-up [animation-delay:180ms]`}>
        <h2 className="font-display text-3xl font-bold leading-none">
          Sueño
          <span className="font-sans text-sm font-semibold text-muted">{avgNote}</span>
        </h2>
        <HoursBars
          rows={periods.map((p) => ({
            key: p.key,
            label: periodLabel(p, g),
            value: p.sleepAvg,
          }))}
          barClass="bg-[var(--sector-estudio)]"
          format={shortDuration}
          minScaleHours={8}
        />
      </section>

      <section className={`${card} animate-fade-up [animation-delay:240ms]`}>
        <h2 className="font-display text-3xl font-bold leading-none">
          Uso del móvil
          <span className="font-sans text-sm font-semibold text-muted">{avgNote}</span>
        </h2>
        <HoursBars
          rows={periods.map((p) => ({
            key: p.key,
            label: periodLabel(p, g),
            value: p.phoneAvg,
          }))}
          barClass="bg-accent"
          format={shortDuration}
        />
      </section>

      {/* PER-110: interrumpidos con sus observaciones */}
      <section className="flex animate-fade-up flex-col gap-3 [animation-delay:300ms]">
        <h2 className="font-display text-3xl font-bold leading-none">Interrumpidos</h2>
        {interruptions.length === 0 ? (
          <p className="text-sm text-muted">Ningún PoM interrumpido en este rango.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {interruptions.map((i) => (
              <li key={i.id} className="leaf-sm flex flex-col gap-1 border border-warn-line bg-warn-soft px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <PauseCircle className="size-3.5 text-primary" />
                  <span>{dayMonth(i.pom_day)}</span> · {formatLocalTime(i.started_at)} ·
                  <SectorSwatch sector={i.sector} className="size-2.5" /> {SECTOR_SHORT[i.sector]}
                </span>
                <span className="font-bold leading-snug">{i.objective}</span>
                <span className="text-sm text-muted">“{i.note}”</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function AvancePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Ambient />
      <AppHeader back />
      <div className="flex animate-fade-up flex-col gap-1">
        <h1 className="font-display text-5xl font-bold leading-none">Avance</h1>
        <p className="text-sm text-muted">Tus PoM, tu sueño y el uso del móvil, día a día.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Progress searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

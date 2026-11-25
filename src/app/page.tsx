import { Suspense } from "react";
import { connection } from "next/server";
import { getPomDay, getSlotAt, getSlotProgress, needsRating } from "@/lib/pom";
import { getSettings } from "@/lib/db";
import { getRunningPom, listPomsForDay } from "@/lib/db/poms";
import { Ambient } from "./_components/ambient";
import { AppHeader } from "./_components/app-header";
import { BrandLogo } from "./_components/brand";
import { DayList } from "./_components/day-list";
import { FinishedCard } from "./_components/finished-card";
import { PomTimer } from "./_components/pom-timer";
import { StartForm } from "./_components/start-form";

/** Cuánto tiempo después de terminar se sigue mostrando la tarjeta para valorar. */
const FINISHED_CARD_MS = 3 * 60 * 60_000;

async function Today() {
  await connection();
  const now = new Date();
  const settings = await getSettings();
  const today = getPomDay(now, settings.day_start_hour);
  const [running, poms] = await Promise.all([getRunningPom(now), listPomsForDay(today)]);
  const slot = getSlotAt(settings.schedule, now);

  const last = poms.at(-1);
  const toRate =
    !running && last && needsRating(last, now) && now.getTime() - new Date(last.ends_at).getTime() < FINISHED_CARD_MS
      ? last
      : null;

  // Pista de foco del bloque en curso (PER-93): su número es "completados + 1" en la franja.
  const progress = running ? getSlotProgress(settings.schedule, poms, now, settings.show_focus_hints) : null;
  const sameSlot = running && progress?.slot.sector === running.sector;
  const runningHint = sameSlot ? progress!.hint : null;
  const blockLabel = sameSlot
    ? `Bloque ${progress!.blockNumber}${progress!.total ? ` de ${progress!.total}` : ""}`
    : null;

  return (
    <>
      <p className="-mt-3 animate-fade-in text-sm font-semibold text-muted">
        Día PoM {today}
        {slot && ` · ${slot.label}`}
      </p>
      {toRate && <FinishedCard key={toRate.id} pom={toRate} />}
      {running ? (
        <PomTimer key={running.id} pom={running} serverNow={now.getTime()} hint={runningHint} blockLabel={blockLabel} />
      ) : (
        <StartForm
          schedule={settings.schedule}
          todaysPoms={poms.map(({ sector, started_at, ends_at, discarded_at, interrupted_at }) => ({
            sector,
            started_at,
            ends_at,
            discarded_at,
            interrupted_at,
          }))}
          showHints={settings.show_focus_hints}
          serverNow={now.getTime()}
        />
      )}
      <DayList poms={poms} now={now} />
    </>
  );
}

export default function Home() {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Ambient />
      <AppHeader />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Today />
      </Suspense>
      <footer className="mt-auto flex justify-center pt-6 opacity-70">
        <BrandLogo className="h-7 w-auto" />
      </footer>
    </main>
  );
}

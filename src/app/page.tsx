import { Suspense } from "react";
import { connection } from "next/server";
import { getPomDay, getSlotAt, needsRating } from "@/lib/pom";
import { getSettings } from "@/lib/db";
import { getRunningPom, listPomsForDay } from "@/lib/db/poms";
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

  return (
    <>
      <p className="text-sm text-zinc-500">
        Día PoM {today}
        {slot && ` · ${slot.label}`}
      </p>
      {toRate && <FinishedCard key={toRate.id} pom={toRate} />}
      {running ? (
        <PomTimer key={running.id} pom={running} serverNow={now.getTime()} />
      ) : (
        <StartForm suggested={slot?.sector ?? null} slotLabel={slot?.label ?? null} />
      )}
      <DayList poms={poms} now={now} />
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">PoM</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <Today />
      </Suspense>
    </main>
  );
}

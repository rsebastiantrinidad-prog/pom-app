import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { addPomDays, getPomDay, getSlotProgress, needsRating } from "@/lib/pom";
import { getSettings } from "@/lib/db";
import { getGameStats } from "@/lib/db/game";
import { getRunningPom, listPomsForDay } from "@/lib/db/poms";
import { getOpenSleep } from "@/lib/db/sleep";
import { getDaySummary } from "@/lib/db/summary";
import { SUMMARY_SEEN_COOKIE } from "@/lib/summary-cookie";
import { iconBtn } from "./_components/app-header";
import { FinishedCard } from "./_components/finished-card";
import { MorningSummary } from "./_components/morning-summary";
import { PomTimer } from "./_components/pom-timer";
import { Screen } from "./_components/screen";
import { SleepButton } from "./_components/sleep-button";
import { SleepScreen } from "./_components/sleep-screen";
import { StartForm } from "./_components/start-form";

/** Cuánto tiempo después de terminar se sigue ofreciendo valorar el bloque. */
const FINISHED_CARD_MS = 3 * 60 * 60_000;

/** Pestaña Foco: una sola acción, empezar el bloque (o el bloque en curso a pantalla completa). */
async function Focus() {
  await connection();
  const now = new Date();
  const settings = await getSettings();
  const today = getPomDay(now, settings.day_start_hour);
  // Resumen matinal (PER-99): hasta que se cierre en el día PoM de hoy.
  const showSummary = (await cookies()).get(SUMMARY_SEEN_COOKIE)?.value !== today;
  const [running, poms, openSleep, summary] = await Promise.all([
    getRunningPom(now),
    listPomsForDay(today),
    getOpenSleep(),
    showSummary ? getDaySummary(addPomDays(today, -1), now) : null,
  ]);

  const last = poms.at(-1);
  const toRate =
    !running && last && needsRating(last, now) && now.getTime() - new Date(last.ends_at).getTime() < FINISHED_CARD_MS
      ? last
      : null;
  const game = toRate ? await getGameStats(settings, now) : null;

  // Pista de foco del bloque en curso (PER-93): su número es "completados + 1" en la franja.
  const progress = running ? getSlotProgress(settings.schedule, poms, now, settings.show_focus_hints) : null;
  const sameSlot = running && progress?.slot.sector === running.sector;
  const runningHint = sameSlot ? progress!.hint : null;
  const blockLabel = sameSlot
    ? `Bloque ${progress!.blockNumber}${progress!.total ? ` de ${progress!.total}` : ""}`
    : null;

  return (
    <>
      {openSleep && <SleepScreen key={openSleep.id} session={openSleep} serverNow={now.getTime()} />}
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
          pomMinutes={settings.pom_minutes}
        />
      )}
      {toRate && game ? (
        <FinishedCard key={toRate.id} pom={toRate} level={game.level} />
      ) : (
        summary && !running && !openSleep && <MorningSummary today={today} summary={summary} />
      )}
    </>
  );
}

export default function Home() {
  return (
    <Screen actions={<SleepButton className={iconBtn} />}>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Focus />
      </Suspense>
    </Screen>
  );
}

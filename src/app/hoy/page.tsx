import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { addPomDays, getPomDay } from "@/lib/pom";
import { getSettings } from "@/lib/db";
import { getGameStats } from "@/lib/db/game";
import { listPomsForDay } from "@/lib/db/poms";
import { listSleepForDays } from "@/lib/db/sleep";
import { DayList } from "../_components/day-list";
import { DayRings, StreakLevel } from "../_components/game";
import { Screen } from "../_components/screen";
import { SleepSection } from "../_components/sleep-section";

export const metadata: Metadata = { title: "Hoy · PoM" };

const fmtDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const s = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return s[0].toUpperCase() + s.slice(1);
};

/** Pestaña Hoy: anillos, racha y nivel, los PoM del día y el sueño. */
async function Today() {
  await connection();
  const now = new Date();
  const settings = await getSettings();
  const today = getPomDay(now, settings.day_start_hour);
  const yesterday = addPomDays(today, -1);
  const [poms, sleeps, game] = await Promise.all([
    listPomsForDay(today),
    listSleepForDays([yesterday, today]),
    getGameStats(settings, now),
  ]);

  return (
    <>
      <p className="-mt-3 text-sm font-semibold text-muted">{fmtDay(today)}</p>
      <section className="card animate-fade-up p-5">
        <DayRings rings={game.rings} />
      </section>
      <div className="animate-fade-up [animation-delay:60ms]">
        <StreakLevel streak={game.streak} level={game.level} />
      </div>
      <DayList poms={poms} now={now} />
      <SleepSection
        serverNow={now.getTime()}
        days={[
          { day: today, label: "Hoy", sessions: sleeps.filter((s) => s.pom_day === today) },
          { day: yesterday, label: "Anoche", sessions: sleeps.filter((s) => s.pom_day === yesterday) },
        ]}
      />
    </>
  );
}

export default function HoyPage() {
  return (
    <Screen title="Hoy">
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Today />
      </Suspense>
    </Screen>
  );
}

import { Suspense } from "react";
import { connection } from "next/server";
import { getPomDay, SECTOR_LABELS } from "@/lib/pom";
import { getSettings } from "@/lib/db";

async function Today() {
  await connection();
  const settings = await getSettings();
  const today = getPomDay(new Date(), settings.day_start_hour);
  const slots = settings.schedule.filter((s) => s.sector);

  return (
    <>
      <p className="text-sm text-zinc-500">Día PoM: {today}</p>
      <ul className="flex flex-col gap-2">
        {slots.map((s) => (
          <li
            key={s.start}
            className="flex justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <span>{SECTOR_LABELS[s.sector!]}</span>
            <span className="text-sm text-zinc-500">
              {s.start}–{s.end} · {s.pom_count} PoM
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">PoM</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <Today />
      </Suspense>
    </main>
  );
}

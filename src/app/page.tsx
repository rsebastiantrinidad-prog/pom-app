import { Suspense } from "react";
import { connection } from "next/server";
import { getPomDay, SECTOR_LABELS, SECTORS } from "@/lib/pom";

async function TodayLabel() {
  await connection();
  return <>{getPomDay(new Date())}</>;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">PoM</h1>
        <p className="text-sm text-zinc-500">
          Día PoM:{" "}
          <Suspense fallback="…">
            <TodayLabel />
          </Suspense>
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {SECTORS.map((s) => (
          <li key={s} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            {SECTOR_LABELS[s]}
          </li>
        ))}
      </ul>
    </main>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getSettings } from "@/lib/db";
import { Ambient } from "../_components/ambient";
import { AppHeader } from "../_components/app-header";
import { HowItWorks } from "../_components/how-it-works";
import { ScheduleEditor } from "../_components/schedule-editor";

export const metadata: Metadata = { title: "Ajustes · PoM" };

async function Editor() {
  await connection();
  const settings = await getSettings();
  return (
    <>
      <HowItWorks pomMinutes={settings.pom_minutes} restMinutes={settings.rest_minutes} />
      <ScheduleEditor initial={settings.schedule} initialShowHints={settings.show_focus_hints} />
    </>
  );
}

export default function AjustesPage() {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Ambient />
      <AppHeader back />
      <h1 className="animate-fade-up font-display text-5xl font-bold leading-none">Ajustes</h1>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}

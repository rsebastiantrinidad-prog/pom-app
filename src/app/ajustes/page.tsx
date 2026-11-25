import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Download } from "lucide-react";
import { getSettings } from "@/lib/db";
import { Ambient } from "../_components/ambient";
import { AppHeader } from "../_components/app-header";
import { HowItWorks } from "../_components/how-it-works";
import { PhoneAppsEditor } from "../_components/phone-apps-editor";
import { ScheduleEditor } from "../_components/schedule-editor";

export const metadata: Metadata = { title: "Ajustes · PoM" };

async function Editor() {
  await connection();
  const settings = await getSettings();
  return (
    <>
      <HowItWorks pomMinutes={settings.pom_minutes} restMinutes={settings.rest_minutes} />
      <ScheduleEditor initial={settings.schedule} initialShowHints={settings.show_focus_hints} />
      <PhoneAppsEditor initial={settings.phone_apps} />
      <Backup />
    </>
  );
}

/** Copia de seguridad (PER-111): descarga todo el historial en CSV. */
function Backup() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-bold leading-none">Copia de seguridad</h2>
        <p className="text-sm text-muted">
          Descarga un .zip con todo tu historial: PoM con valoraciones, sueño, uso del móvil y ajustes. Cada tabla
          viene en un archivo CSV que se abre en Google Sheets o Excel.
        </p>
      </div>
      {/* Enlace común (no fetch): el navegador descarga el archivo con la sesión de Access. */}
      <a
        href="/exportar"
        download
        className="press leaf flex items-center justify-center gap-2 border border-line bg-background/70 py-3 font-display text-2xl font-bold backdrop-blur hover:border-primary"
      >
        <Download className="size-5" /> Descargar mis datos
      </a>
    </section>
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

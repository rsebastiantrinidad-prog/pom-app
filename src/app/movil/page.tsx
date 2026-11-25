import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { addPomDays, getPomDay } from "@/lib/pom";
import { getSettings } from "@/lib/db";
import { listUsageForDay } from "@/lib/db/phone";
import { Screen } from "../_components/screen";
import { PhoneUsageForm } from "../_components/phone-usage-form";

export const metadata: Metadata = { title: "Uso del móvil · PoM" };

function labelFor(day: string, today: string) {
  if (day === today) return "Hoy";
  if (day === addPomDays(today, -1)) return "Ayer";
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(".", "");
}

async function Usage({ searchParams }: { searchParams: Promise<{ dia?: string | string[] }> }) {
  await connection();
  const settings = await getSettings();
  const today = getPomDay(new Date(), settings.day_start_hour);
  const requested = (await searchParams).dia;
  // Por defecto el día anterior: es cuando el celular ya muestra el tiempo de pantalla completo.
  const day =
    typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today
      ? requested
      : addPomDays(today, -1);

  const usage = await listUsageForDay(day);
  const saved = Object.fromEntries(usage.map((u) => [u.app, u.minutes]));
  // Apps visibles, más las ocultas que tienen dato ese día (para no esconder lo ya cargado).
  const apps = settings.phone_apps
    .filter((a) => !a.hidden || a.name in saved)
    .map(({ name, hidden }) => ({ name, hidden }));

  return (
    <PhoneUsageForm
      key={day}
      day={day}
      dayLabel={labelFor(day, today)}
      prevDay={addPomDays(day, -1)}
      nextDay={day < today ? addPomDays(day, 1) : null}
      apps={apps}
      saved={saved}
    />
  );
}

export default function MovilPage({ searchParams }: { searchParams: Promise<{ dia?: string | string[] }> }) {
  return (
    <Screen back="/mas" title="Uso del móvil" subtitle="Cuánto tiempo pasaste en cada app.">
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Usage searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

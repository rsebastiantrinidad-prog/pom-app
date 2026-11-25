import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/db/push";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import { Screen } from "../_components/screen";
import { PushSettings } from "../_components/push-settings";
import { ThemePicker } from "../_components/theme-controls";
import { HowItWorks } from "../_components/how-it-works";
import { PhoneAppsEditor } from "../_components/phone-apps-editor";
import { ScheduleEditor } from "../_components/schedule-editor";

export const metadata: Metadata = { title: "Ajustes · PoM" };

async function Editor() {
  await connection();
  const [settings, publicKey] = await Promise.all([getSettings(), getVapidPublicKey()]);
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-3xl font-bold leading-none">Apariencia</h2>
        <ThemePicker initial={isTheme(theme) ? theme : "system"} />
      </section>
      <PushSettings publicKey={publicKey} />
      <HowItWorks pomMinutes={settings.pom_minutes} restMinutes={settings.rest_minutes} />
      <ScheduleEditor initial={settings.schedule} initialShowHints={settings.show_focus_hints} />
      <PhoneAppsEditor initial={settings.phone_apps} />
    </>
  );
}

export default function AjustesPage() {
  return (
    <Screen back="/mas" title="Ajustes">
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Editor />
      </Suspense>
    </Screen>
  );
}

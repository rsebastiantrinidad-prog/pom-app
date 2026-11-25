import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/quicksand";
import "@fontsource-variable/smooch-sans";
import "./globals.css";
import { isTheme, THEME_BAR, THEME_COOKIE, type Theme } from "@/lib/theme";
import { RegisterServiceWorker } from "./_components/pwa";
import { TabBar } from "./_components/tab-bar";

export const metadata: Metadata = {
  title: "PoM",
  description: "Bloques de foco de 40 minutos por sector · Driven By People",
  applicationName: "PoM",
  appleWebApp: { capable: true, title: "PoM", statusBarStyle: "default" },
};

async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : "system";
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    viewportFit: "cover",
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: THEME_BAR.light },
            { media: "(prefers-color-scheme: dark)", color: THEME_BAR.dark },
          ]
        : THEME_BAR[theme],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();
  return (
    <html lang="es" className="h-full antialiased" data-theme={theme === "system" ? undefined : theme}>
      <head>
        {/* Con credenciales: Cloudflare Access protege también el manifest (PER-102). */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <TabBar />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "@fontsource-variable/quicksand";
import "@fontsource-variable/smooch-sans";
import "./globals.css";
import { RegisterServiceWorker } from "./_components/pwa";

export const metadata: Metadata = {
  title: "PoM",
  description: "Bloques de foco de 40 minutos por sector · Driven By People",
  applicationName: "PoM",
  appleWebApp: { capable: true, title: "PoM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        {/* Con credenciales: Cloudflare Access protege también el manifest (PER-102). */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

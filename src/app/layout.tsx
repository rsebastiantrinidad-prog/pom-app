import type { Metadata, Viewport } from "next";
import "@fontsource-variable/quicksand";
import "@fontsource-variable/smooch-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoM",
  description: "Bloques de foco de 40 minutos por sector · Driven By People",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

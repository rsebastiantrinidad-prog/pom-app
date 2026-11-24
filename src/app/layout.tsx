import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoM",
  description: "Bloques de foco de 40 minutos por sector",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

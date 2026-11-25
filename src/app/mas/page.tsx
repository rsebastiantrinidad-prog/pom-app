import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Download, HelpCircle, Settings2, Smartphone } from "lucide-react";
import { BrandLogo } from "../_components/brand";
import { Screen } from "../_components/screen";

export const metadata: Metadata = { title: "Más · PoM" };

const rows = [
  { href: "/movil", icon: Smartphone, title: "Uso del móvil", desc: "Cargá el tiempo de pantalla por app" },
  { href: "/ajustes", icon: Settings2, title: "Ajustes", desc: "Tema, avisos, horario y apps del móvil" },
  { href: "/ajustes#como-funciona", icon: HelpCircle, title: "Cómo funciona", desc: "Qué es un PoM, franjas y bloques" },
];

/** Pestaña Más: todo lo que no es del día a día, en una lista simple. */
export default function MasPage() {
  return (
    <Screen title="Más">
      <ul className="card animate-fade-up divide-y divide-line overflow-hidden">
        {rows.map(({ href, icon: Icon, title, desc }) => (
          <li key={href}>
            <Link href={href} className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">{title}</span>
                <span className="truncate text-xs text-muted">{desc}</span>
              </span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          </li>
        ))}
        {/* Copia de seguridad (PER-111): enlace común, el navegador descarga con la sesión de Access. */}
        <li>
          <a href="/exportar" download className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong">
              <Download className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold">Descargar mis datos</span>
              <span className="truncate text-xs text-muted">Copia de seguridad en CSV (.zip)</span>
            </span>
          </a>
        </li>
      </ul>
      <footer className="mt-auto flex flex-col items-center gap-2 pt-8 opacity-70">
        <BrandLogo className="h-7 w-auto" />
      </footer>
    </Screen>
  );
}

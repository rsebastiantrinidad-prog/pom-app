"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck, Ellipsis, Timer } from "lucide-react";

const TABS = [
  { href: "/", label: "Foco", icon: Timer, match: (p: string) => p === "/" },
  { href: "/hoy", label: "Hoy", icon: CalendarCheck, match: (p: string) => p.startsWith("/hoy") },
  { href: "/avance", label: "Avance", icon: BarChart3, match: (p: string) => p.startsWith("/avance") },
  {
    href: "/mas",
    label: "Más",
    icon: Ellipsis,
    match: (p: string) => ["/mas", "/movil", "/ajustes"].some((r) => p.startsWith(r)),
  },
];

/** Barra de pestañas inferior: las 4 secciones de la app, siempre a mano del pulgar. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const on = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`press flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-bold ${
                  on ? "text-primary" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${on ? "bg-primary/12" : ""}`}
                >
                  <Icon className="size-[22px]" strokeWidth={on ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

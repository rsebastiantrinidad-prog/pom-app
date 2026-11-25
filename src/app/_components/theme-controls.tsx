"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { setThemeAction } from "@/app/actions";
import type { Theme } from "@/lib/theme";

/** Aplica el tema al instante (sin recargar) y lo guarda. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  void setThemeAction(theme);
}

function isDarkNow() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Botón rápido del encabezado: alterna entre claro y oscuro. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => applyTheme(isDarkNow() ? "light" : "dark")}
      aria-label="Cambiar tema claro u oscuro"
      className={className}
    >
      <Moon className="size-5 dark:hidden" />
      <Sun className="hidden size-5 dark:block" />
    </button>
  );
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

/** Selector completo (Ajustes): Sistema / Claro / Oscuro. */
export function ThemePicker({ initial }: { initial: Theme }) {
  const [value, setValue] = useState<Theme>(initial);
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
      {OPTIONS.map(({ value: v, label, icon: Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              setValue(v);
              applyTheme(v);
            }}
            className={`press flex flex-col items-center gap-1 rounded-xl py-2.5 text-sm font-bold ${
              on ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

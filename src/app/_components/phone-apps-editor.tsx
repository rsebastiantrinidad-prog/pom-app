"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { savePhoneAppsAction } from "@/app/actions";
import type { PhoneApp } from "@/lib/pom";

/**
 * Lista de apps del móvil (PER-97). No se borran: se ocultan, así sus registros
 * históricos quedan. Renombrar también renombra lo ya cargado.
 */
export function PhoneAppsEditor({ initial }: { initial: PhoneApp[] }) {
  const [apps, setApps] = useState<PhoneApp[]>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const saved = new Set(initial.map((a) => a.id));

  const update = (i: number, patch: Partial<PhoneApp>) => {
    setMsg(null);
    setApps((all) => all.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await savePhoneAppsAction(apps);
          setMsg(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: res.error });
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-bold leading-none">Apps del móvil</h2>
        <p className="text-sm text-muted">
          Las que cargás en “Uso del móvil”. Ocultar una app la saca de la carga diaria pero conserva lo que ya cargaste.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {apps.map((a, i) => (
          <li
            key={a.id}
            className={`leaf-sm flex items-center gap-2 border border-line bg-background/70 p-2 backdrop-blur transition-opacity ${a.hidden ? "opacity-60" : ""}`}
          >
            <input
              aria-label="Nombre de la app"
              value={a.name}
              onChange={(e) => update(i, { name: e.target.value })}
              maxLength={40}
              className="leaf-sm min-w-0 flex-1 border border-transparent bg-transparent px-2 py-1.5 text-base font-bold focus:border-primary focus:outline-none"
            />
            {saved.has(a.id) ? (
              <button
                type="button"
                onClick={() => update(i, { hidden: !a.hidden })}
                aria-pressed={a.hidden}
                className="press flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-muted hover:text-primary"
              >
                {a.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {a.hidden ? "Oculta" : "Visible"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setApps((all) => all.filter((_, j) => j !== i))}
                className="press rounded-full px-3 py-2 text-xs font-bold text-muted hover:text-red-600"
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          setMsg(null);
          setApps((all) => [...all, { id: crypto.randomUUID().slice(0, 8), name: "", hidden: false }]);
        }}
        className="press leaf-sm flex items-center justify-center gap-2 border border-dashed border-primary py-3 font-bold text-primary"
      >
        <Plus className="size-4" /> Agregar app
      </button>

      {msg && <p className={`text-sm font-bold ${msg.ok ? "text-accent-strong" : "text-red-600"}`}>{msg.text}</p>}

      <button
        type="submit"
        disabled={pending}
        className="press leaf bg-foreground py-3 font-display text-2xl font-bold text-background disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar apps"}
      </button>
    </form>
  );
}

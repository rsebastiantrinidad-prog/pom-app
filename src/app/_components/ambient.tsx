/**
 * Fondo etéreo: luces difusas con los colores de marca que flotan despacio.
 * Muy sutil y quieto en las pantallas normales; más presente y en movimiento en el modo foco.
 */
export function Ambient({ intensity = "soft" }: { intensity?: "soft" | "focus" }) {
  const focus = intensity === "focus";
  const o = focus ? "opacity-50 dark:opacity-35" : "opacity-[0.18] dark:opacity-[0.14]";
  // En las pantallas normales las luces quedan quietas: animar blur grande cuesta batería y fluidez.
  const a = focus ? "animate-drift-a" : "";
  const b = focus ? "animate-drift-b" : "";
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${o}`}>
      <div className={`absolute -left-1/4 -top-1/4 size-[80vmax] ${a} rounded-full bg-[radial-gradient(circle,var(--dbp-violet-300)_0%,transparent_60%)] blur-3xl`} />
      <div className={`absolute -right-1/3 top-1/4 size-[70vmax] ${b} rounded-full bg-[radial-gradient(circle,var(--dbp-teal-200)_0%,transparent_60%)] blur-3xl`} />
    </div>
  );
}

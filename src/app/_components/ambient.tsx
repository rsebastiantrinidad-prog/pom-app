/**
 * Fondo etéreo: tres luces difusas con los colores de marca que flotan despacio.
 * `intensity` regula cuánto se notan (sutil en el inicio, más presente en el foco).
 */
export function Ambient({ intensity = "soft" }: { intensity?: "soft" | "focus" }) {
  const o = intensity === "focus" ? "opacity-60 dark:opacity-45" : "opacity-35 dark:opacity-25";
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${o}`}>
      <div className="absolute -left-1/4 -top-1/4 size-[80vmax] animate-drift-a rounded-full bg-[radial-gradient(circle,var(--dbp-violet-300)_0%,transparent_60%)] blur-3xl" />
      <div className="absolute -right-1/3 top-1/4 size-[70vmax] animate-drift-b rounded-full bg-[radial-gradient(circle,var(--dbp-teal-200)_0%,transparent_60%)] blur-3xl" />
      <div className="absolute -bottom-1/3 left-0 size-[60vmax] animate-drift-c rounded-full bg-[radial-gradient(circle,var(--dbp-indigo)_0%,transparent_62%)] opacity-60 blur-3xl" />
    </div>
  );
}

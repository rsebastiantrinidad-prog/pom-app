/**
 * Esqueleto instantáneo al cambiar de pestaña: se muestra apenas tocás, mientras
 * el servidor prepara la pantalla (Next.js lo precarga con los enlaces).
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando"
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div className="flex h-12 items-center justify-between">
        <div className="skeleton h-8 w-24" />
        <div className="skeleton size-9 rounded-full" />
      </div>
      <div className="skeleton h-11 w-40" />
      <div className="skeleton h-40" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-56" />
    </main>
  );
}

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BrandIsotipo } from "./brand";
import { ThemeToggle } from "./theme-controls";

export const iconBtn =
  "press grid size-10 place-items-center rounded-full text-foreground hover:bg-surface-2 disabled:opacity-40";

/**
 * Encabezado compacto. En las pestañas: isotipo + "PoM". En pantallas internas
 * (back): botón volver. A la derecha, acciones de la pantalla y el tema.
 */
export function AppHeader({ back, actions }: { back?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex h-12 items-center justify-between">
      {back ? (
        <Link href={back} className="press -ml-2 flex items-center gap-0.5 pr-3 font-bold text-primary" aria-label="Volver">
          <ChevronLeft className="size-6" /> Volver
        </Link>
      ) : (
        <Link href="/" className="flex items-center gap-2" aria-label="Inicio">
          <BrandIsotipo className="h-8 w-auto" />
          <span className="font-display text-3xl font-extrabold tracking-tight">PoM</span>
        </Link>
      )}
      <div className="-mr-2 flex items-center gap-1">
        {actions}
        <ThemeToggle className={iconBtn} />
      </div>
    </header>
  );
}

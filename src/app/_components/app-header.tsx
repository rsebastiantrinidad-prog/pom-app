import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { BrandIsotipo } from "./brand";

const iconBtn =
  "press grid size-11 place-items-center rounded-full border border-line bg-background/70 text-foreground backdrop-blur hover:border-primary";

/** Encabezado: isotipo de Driven By People + nombre de la app. */
export function AppHeader({ back }: { back?: boolean }) {
  return (
    <header className="flex animate-fade-in items-center justify-between">
      <Link href="/" className="flex items-center gap-3" aria-label="Inicio">
        <BrandIsotipo className="h-11 w-auto" />
        <span className="flex flex-col leading-none">
          <span className="font-display text-4xl font-extrabold tracking-tight">PoM</span>
          <span className="text-xs font-semibold tracking-wide text-muted">bloques de foco</span>
        </span>
      </Link>
      {back ? (
        <Link href="/" className={iconBtn} aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Link>
      ) : (
        <Link href="/ajustes" className={iconBtn} aria-label="Ajustes">
          <Settings2 className="size-5" />
        </Link>
      )}
    </header>
  );
}

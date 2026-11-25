import { Ambient } from "./ambient";
import { AppHeader } from "./app-header";

/**
 * Esqueleto de cada pantalla: encabezado, título grande opcional, contenido y
 * lugar abajo para la barra de pestañas (que vive en el layout y no se recarga).
 */
export function Screen({
  title,
  subtitle,
  back,
  actions,
  children,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  back?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Ambient />
        <AppHeader back={back} actions={actions} />
        {title && (
          <div className="flex animate-fade-up flex-col gap-1">
            <h1 className="font-display text-[2.75rem] font-bold leading-none tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm font-semibold text-muted">{subtitle}</p>}
          </div>
        )}
        {children}
    </main>
  );
}

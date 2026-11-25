"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Hoja inferior (bottom sheet) sobre la pantalla: para avisos que se atienden y
 * se cierran (resumen matinal, valorar el bloque), sin ensuciar la pantalla.
 */
export function Sheet({
  title,
  onClose,
  children,
  label,
}: {
  title?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  label: string;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div data-overlay className="fixed inset-0 z-50 flex animate-fade-in items-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[92dvh] w-full max-w-md animate-sheet flex-col gap-4 overflow-y-auto rounded-t-[1.75rem] border border-b-0 border-line bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      >
        <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">{title}</div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="press -mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

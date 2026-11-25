"use client";

import { useEffect, useState } from "react";
import { nextQuote, QUOTES } from "@/lib/pom";

/** Cada cuánto cambia la frase durante el bloque. */
const EVERY_MS = 2 * 60_000;

/**
 * Frase sobre el tiempo y el foco mientras corre el PoM: aparece despacio, al
 * azar, y cambia cada 2 minutos sin repetir la anterior. Discreta, para no
 * competir con el reloj ni con el objetivo.
 */
export function RotatingQuote() {
  // Se elige en el cliente (después de cargar) para no desincronizar con el servidor.
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const show = () => setIndex((i) => nextQuote(i));
    const first = setTimeout(show, 800); // aparece apenas arranca el bloque
    const id = setInterval(show, EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (index === null) return <div className="min-h-20" aria-hidden />;
  const q = QUOTES[index];
  return (
    <figure
      key={index}
      className="flex min-h-20 max-w-xs animate-fade-in flex-col items-center gap-1.5 text-center [animation-duration:1.4s]"
    >
      <blockquote className="text-[15px] italic leading-snug text-foreground/80">“{q.text}”</blockquote>
      <figcaption className="text-xs font-semibold text-muted">
        {q.author} · <span className="font-medium">{q.source}</span>
      </figcaption>
    </figure>
  );
}

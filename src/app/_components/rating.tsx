"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { ratePomAction } from "@/app/actions";

const LABELS = ["", "Difícil", "Flojo", "Bien", "Muy bien", "Excelente"];

/** Valoración de 1 a 5 estrellas con comentario opcional (PER-109). También sirve para corregirla. */
export function RatingForm({
  pomId,
  initialRating,
  initialNote,
  onDone,
}: {
  pomId: string;
  initialRating: number | null;
  initialNote: string | null;
  onDone?: () => void;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [note, setNote] = useState(initialNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex animate-fade-in flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return;
        setError(null);
        startTransition(async () => {
          const res = await ratePomAction(pomId, rating, note);
          if (res.ok) onDone?.();
          else setError(res.error);
        });
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex" role="radiogroup" aria-label="Valoración">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= rating;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                className="press grid size-11 place-items-center"
              >
                <Star
                  key={on ? `on-${rating}` : "off"}
                  className={`size-8 transition-colors duration-300 ${on ? "animate-pop fill-star text-star" : "text-star-off"}`}
                  style={on ? { animationDelay: `${(n - 1) * 40}ms` } : undefined}
                />
              </button>
            );
          })}
        </div>
        <span className="text-sm font-bold text-muted">{LABELS[rating]}</span>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="Comentario (opcional)"
        className="leaf-sm border border-line bg-background px-3 py-2.5 text-base placeholder:text-muted focus:border-primary focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="press px-1 py-2 text-sm font-semibold text-muted">
            Después
          </button>
        )}
        <button
          type="submit"
          disabled={!rating || pending}
          className="press leaf-sm ml-auto bg-primary px-6 py-2.5 font-bold text-primary-fg disabled:opacity-35"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/** Estrellas de una valoración ya guardada, que se abren para editar. */
export function RatingInline({ pomId, rating, note }: { pomId: string; rating: number | null; note: string | null }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <RatingForm pomId={pomId} initialRating={rating} initialNote={note} onDone={() => setEditing(false)} />;
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="press flex items-center gap-2 text-left text-sm">
      {rating ? (
        <>
          <span className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`size-4 ${n <= rating ? "fill-star text-star" : "text-star-off"}`} />
            ))}
          </span>
          {note && <span className="text-muted">{note}</span>}
        </>
      ) : (
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Valorar este bloque</span>
      )}
    </button>
  );
}

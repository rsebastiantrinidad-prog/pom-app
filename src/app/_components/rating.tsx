"use client";

import { useState, useTransition } from "react";
import { ratePomAction } from "@/app/actions";

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
      className="flex flex-col gap-2"
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
      <div className="flex gap-1" role="radiogroup" aria-label="Valoración">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={`text-3xl leading-none ${n <= rating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}`}
          >
            ★
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="Comentario (opcional)"
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="rounded-xl px-3 py-2 text-sm text-zinc-500">
            Después
          </button>
        )}
        <button
          type="submit"
          disabled={!rating || pending}
          className="ml-auto rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/** Estrellas de una valoración ya guardada, que se abren para editar. */
export function RatingInline({
  pomId,
  rating,
  note,
}: {
  pomId: string;
  rating: number | null;
  note: string | null;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <RatingForm pomId={pomId} initialRating={rating} initialNote={note} onDone={() => setEditing(false)} />;
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="text-left text-sm">
      {rating ? (
        <>
          <span className="text-amber-500">{"★".repeat(rating)}</span>
          <span className="text-zinc-300 dark:text-zinc-700">{"★".repeat(5 - rating)}</span>
          {note && <span className="ml-2 text-zinc-500">{note}</span>}
        </>
      ) : (
        <span className="text-amber-700 underline dark:text-amber-500">Pendiente de valorar</span>
      )}
    </button>
  );
}

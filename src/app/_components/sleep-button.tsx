"use client";

import { useTransition } from "react";
import { BedDouble } from "lucide-react";
import { startSleepAction } from "@/app/actions";

/** "A dormir" (PER-94) como acción del encabezado o botón grande. */
export function SleepButton({ className = "", label }: { className?: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="A dormir"
      onClick={() =>
        startTransition(async () => {
          const res = await startSleepAction();
          if (!res.ok) alert(res.error);
        })
      }
      className={className}
    >
      <BedDouble className="size-5" />
      {label}
    </button>
  );
}

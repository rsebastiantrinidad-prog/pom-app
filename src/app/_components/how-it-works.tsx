import { CalendarClock, Hash, Timer } from "lucide-react";

/** Explicación breve de cómo funciona PoM, arriba de la configuración. */
export function HowItWorks({ pomMinutes, restMinutes }: { pomMinutes: number; restMinutes: number }) {
  const items = [
    {
      icon: Timer,
      title: "Qué es un PoM",
      text: (
        <>
          Un bloque de <b>{pomMinutes} minutos de foco</b> en una sola tarea, seguido de{" "}
          <b>{restMinutes} minutos de descanso</b>. Antes de empezar escribís qué vas a lograr; al terminar, lo valorás
          con estrellas. Solo cuenta si llegás al final sin interrumpirlo.
        </>
      ),
    },
    {
      icon: CalendarClock,
      title: "Para qué sirven los ejes",
      text: (
        <>
          Son los grandes momentos de tu día, cada uno con su horario. Ejemplo: de 15:00 a 22:00, <b>Driven By People</b>.
          Cuando abrís la app, mira la hora y te propone el sector del eje en el que estás. Los ejes sin sector (como
          Dormir) no proponen nada: ahí elegís vos.
        </>
      ),
    },
    {
      icon: Hash,
      title: "PoM planificados",
      text: (
        <>
          Cuántos bloques querés hacer en ese eje. Con 8, la app te muestra <b>“bloque 3 de 8”</b> para que sepas
          cuánto llevás. Es una guía, no una obligación: podés hacer más o menos.
        </>
      ),
    },
  ];

  return (
    <section id="como-funciona" className="scroll-mt-4 rounded-2xl flex animate-fade-up flex-col gap-4 border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="font-display text-3xl font-bold leading-none">Cómo funciona</h2>
      <ul className="flex flex-col gap-4">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="rounded-xl grid size-9 shrink-0 place-items-center bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold">{title}</p>
              <p className="text-sm leading-relaxed text-muted [&_b]:font-bold [&_b]:text-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

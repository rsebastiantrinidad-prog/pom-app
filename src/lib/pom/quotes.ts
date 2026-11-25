/**
 * Frases sobre gestión del tiempo, foco y constancia que se muestran mientras
 * corre un PoM. Solo citas con fuente identificable (libro, carta, discurso o
 * entrevista); se descartaron las muy difundidas pero de atribución dudosa.
 * El texto es una traducción al español.
 */
export interface Quote {
  text: string;
  author: string;
  source: string;
}

export const QUOTES: Quote[] = [
  {
    text: "Hasta que no podamos gestionar el tiempo, no podemos gestionar nada más.",
    author: "Peter Drucker",
    source: "El ejecutivo eficaz (1967)",
  },
  {
    text: "No hay nada tan inútil como hacer con eficiencia algo que no debería hacerse en absoluto.",
    author: "Peter Drucker",
    source: "Harvard Business Review (1963)",
  },
  {
    text: "El trabajo se expande hasta llenar el tiempo disponible para completarlo.",
    author: "C. Northcote Parkinson",
    source: "The Economist (1955)",
  },
  {
    text: "Lo importante no es priorizar lo que está en tu agenda, sino agendar tus prioridades.",
    author: "Stephen R. Covey",
    source: "Los 7 hábitos de la gente altamente efectiva",
  },
  {
    text: "Lo principal es que lo principal siga siendo lo principal.",
    author: "Stephen R. Covey",
    source: "Primero lo primero (1994)",
  },
  {
    text: "Cómo pasamos nuestros días es, por supuesto, cómo pasamos nuestra vida.",
    author: "Annie Dillard",
    source: "The Writing Life (1989)",
  },
  {
    text: "No es que tengamos poco tiempo, sino que perdemos mucho.",
    author: "Séneca",
    source: "Sobre la brevedad de la vida",
  },
  {
    text: "El tiempo perdido nunca se vuelve a encontrar.",
    author: "Benjamin Franklin",
    source: "Poor Richard's Almanack (1748)",
  },
  {
    text: "Enfocarse es decir que no a las otras cien buenas ideas que hay.",
    author: "Steve Jobs",
    source: "Conferencia de desarrolladores de Apple (1997)",
  },
  {
    text: "Si algo es lo suficientemente importante, hay que intentarlo, aunque lo más probable sea fracasar.",
    author: "Elon Musk",
    source: "Entrevista en 60 Minutes (2014)",
  },
  {
    text: "Para rendir al máximo necesitás trabajar períodos largos, con concentración total en una sola tarea y sin distracciones.",
    author: "Cal Newport",
    source: "Deep Work (2016)",
  },
  {
    text: "No subís al nivel de tus metas: caés al nivel de tus sistemas.",
    author: "James Clear",
    source: "Hábitos atómicos (2018)",
  },
  {
    text: "Si no priorizás tu vida, alguien más lo va a hacer.",
    author: "Greg McKeown",
    source: "Esencialismo (2014)",
  },
  {
    text: "Si tenés que comerte dos ranas, empezá por la más fea.",
    author: "Brian Tracy",
    source: "¡Tráguese ese sapo! (2001)",
  },
  {
    text: "Estar ocupado es una forma de pereza: pensamiento perezoso y acción indiscriminada.",
    author: "Tim Ferriss",
    source: "La semana laboral de 4 horas (2007)",
  },
  {
    text: "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto sino un hábito.",
    author: "Will Durant",
    source: "Historia de la filosofía (1926)",
  },
  {
    text: "Quien se atreve a perder una hora de tiempo no ha descubierto el valor de la vida.",
    author: "Charles Darwin",
    source: "Carta a su hermana Susan (1836)",
  },
  {
    text: "Si buscás tranquilidad, hacé menos. O mejor: hacé lo esencial.",
    author: "Marco Aurelio",
    source: "Meditaciones",
  },
];

/** Una cita al azar distinta de la actual (para que nunca se repita seguida). */
export function nextQuote(current: number | null, random: () => number = Math.random): number {
  if (QUOTES.length < 2) return 0;
  let i = Math.floor(random() * QUOTES.length);
  if (i === current) i = (i + 1) % QUOTES.length;
  return i;
}

import type { PomDay } from "./day";

export const SECTORS = ["estudio", "personal", "dbp"] as const;
export type Sector = (typeof SECTORS)[number];

export const SECTOR_LABELS: Record<Sector, string> = {
  estudio: "Estudio/lectura",
  personal: "Tareas personales",
  dbp: "Driven By People",
};

/** Fila de `pom_sessions`. Fechas como ISO string (timestamptz). */
export interface PomSession {
  id: string;
  sector: Sector;
  sector_suggested: Sector | null;
  objective: string;
  started_at: string;
  ends_at: string;
  discarded_at: string | null;
  rating: number | null;
  rating_note: string | null;
  rated_at: string | null;
  pom_day: PomDay;
  interrupted_at: string | null;
  interruption_note: string | null;
  created_at: string;
}

export interface SleepSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  pom_day: PomDay;
  created_at: string;
}

/** App del móvil para la carga diaria (PER-97). `id` estable; ocultar no borra registros. */
export interface PhoneApp {
  id: string;
  name: string;
  hidden: boolean;
}

export interface PhoneUsage {
  id: string;
  pom_day: PomDay;
  app: string;
  minutes: number;
  updated_at: string;
}

/** Foco del día (franja horaria de la rutina). `end` exclusivo, formato HH:MM ("24:00" permitido). */
export interface ScheduleSlot {
  start: string;
  end: string;
  label: string;
  sector: Sector | null;
  /** Cantidad de PoM de referencia (no es una meta guardada). */
  pom_count: number | null;
  /** Sugerencias por número de bloque (opcional). */
  focus_hints?: Record<string, string>;
}

export interface AppSettings {
  day_start_hour: number;
  pom_minutes: number;
  rest_minutes: number;
  schedule: ScheduleSlot[];
  phone_apps: PhoneApp[];
  /** Mostrar la sugerencia por bloque (PER-93). */
  show_focus_hints: boolean;
}

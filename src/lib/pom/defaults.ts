import type { AppSettings } from "./types";

/** Configuración por defecto. Debe coincidir con el seed de la migración inicial. */
export const DEFAULT_SETTINGS: AppSettings = {
  day_start_hour: 9,
  pom_minutes: 40,
  rest_minutes: 10,
  schedule: [
    { start: "00:00", end: "02:00", label: "Estudio / lectura", sector: "estudio", pom_count: 2 },
    { start: "02:00", end: "09:00", label: "Dormir", sector: null, pom_count: null },
    { start: "09:00", end: "10:00", label: "Arranque del día", sector: null, pom_count: null },
    { start: "10:00", end: "15:00", label: "Tareas personales", sector: "personal", pom_count: 4 },
    {
      start: "15:00",
      end: "22:00",
      label: "Driven By People",
      sector: "dbp",
      pom_count: 8,
      focus_hints: {
        "1": "Seguimiento y checklist",
        "2": "Creación y ajuste",
        "3": "Creación y ajuste",
        "4": "Creación y ajuste",
        "5": "Creación y ajuste",
        "6": "Creación y ajuste",
        "7": "Definición",
        "8": "Cierre",
      },
    },
    { start: "22:00", end: "24:00", label: "Libre", sector: null, pom_count: null },
  ],
  phone_apps: ["TikTok", "X", "Chrome", "Instagram"].map((name) => ({ id: name, name, hidden: false })),
  show_focus_hints: true,
};

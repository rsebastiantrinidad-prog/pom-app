/** Tema de la app: "system" sigue al celular; "light" y "dark" lo fijan. Se guarda en una cookie. */
export const THEME_COOKIE = "pom_tema";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);

/** Colores de la barra del sistema (status bar) por tema. */
export const THEME_BAR = { light: "#ffffff", dark: "#0b0a10" } as const;

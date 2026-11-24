# PoM

Web app móvil para contar bloques de foco de 40 minutos (PoM) por sector y cruzarlos con sueño y uso del móvil.
Spec y tareas: proyecto **PoM** en Linear.

## Stack

Next.js (App Router, TypeScript) + Supabase (Postgres) · Vercel · PWA.

## Estructura

- `src/lib/pom/` — lógica de negocio de PoM, sin UI ni Supabase (reutilizable en el sitio de Driven By People).
  - `day.ts` — **única** función que calcula el día PoM (09:00 a 09:00, America/Argentina/Cordoba).
- `src/lib/supabase/` — clientes de Supabase.
- `src/app/` — interfaz.
- `supabase/migrations/` — migraciones SQL versionadas.

## Desarrollo

```bash
cp .env.example .env.local   # completar con los datos de Supabase
npm install
npm run dev
npm test
```

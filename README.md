# PoM

Web app móvil para contar bloques de foco de 40 minutos (PoM) por sector y cruzarlos con sueño y uso del móvil.
Spec y tareas: proyecto **PoM** en Linear.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind).
- **Cloudflare Workers**: hosting. La app de Next se adapta con [OpenNext](https://opennext.js.org/cloudflare).
- **Cloudflare D1**: base de datos (SQLite administrado por Cloudflare).
- **Cloudflare Access**: protege la URL sin login propio (solo miembros de la cuenta de Cloudflare).
- PWA instalable (hito 6).

¿Primera vez con Cloudflare? Leé [docs/cloudflare.md](docs/cloudflare.md).

## Estructura

```
src/lib/pom/       Lógica de negocio de PoM, sin UI ni base de datos
                   (reutilizable en el sitio de Driven By People).
  day.ts           ÚNICA función que calcula el día PoM (09:00 a 09:00, America/Argentina/Cordoba).
src/lib/db/        Acceso a D1. Solo del lado del servidor.
src/app/           Interfaz (Next.js App Router).
migrations/        Migraciones SQL de D1, numeradas y versionadas.
wrangler.jsonc     Configuración de Cloudflare (Worker, D1).
open-next.config.ts  Configuración del adaptador OpenNext.
```

## Comandos

| Comando | Qué hace |
| -- | -- |
| `npm install` | Instala dependencias. |
| `npm run db:migrate:local` | Crea o actualiza la base D1 **local** (en `.wrangler/`). |
| `npm run dev` | Servidor de desarrollo de Next en http://localhost:3000, con la D1 local. |
| `npm test` | Pruebas (Vitest). |
| `npm run preview` | Compila para Cloudflare y lo corre en local con el runtime real de Workers (http://localhost:8787). |
| `npm run db:migrate:remote` | Aplica las migraciones pendientes a la base D1 **en Cloudflare**. |
| `npm run deploy` | Compila y publica en Cloudflare. |
| `npm run cf-typegen` | Regenera los tipos de `env` (correr después de cambiar `wrangler.jsonc`). |

Primera vez en una máquina nueva:

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Base de datos

- Las fechas se guardan como texto ISO 8601 UTC (`2026-11-24T17:00:00.000Z`), como devuelve `Date#toISOString()`.
- `pom_day` (`YYYY-MM-DD`) lo calcula siempre `getPomDay()`; la base no calcula días.
- La base aplica las reglas del spec: un solo PoM en curso, descarte solo en los primeros 2 minutos,
  interrupción con observación obligatoria, un registro por día y app, y **nada se borra** (DELETE bloqueado).
- Para cambiar el esquema: crear `migrations/000N_descripcion.sql` (nunca editar una migración ya aplicada en remoto).

Consultar la base desde la terminal:

```bash
npx wrangler d1 execute pom-db --local  --command "SELECT * FROM pom_sessions"
npx wrangler d1 execute pom-db --remote --command "SELECT * FROM pom_sessions"
```

# Cloudflare desde cero (para PoM)

Guía corta de las piezas de Cloudflare que usa este proyecto, qué es cada una y cómo se usa.

## El mapa

```
Celular / navegador
      │  https://pom-app.<tu-subdominio>.workers.dev
      ▼
┌──────────────────────────── Cloudflare ────────────────────────────┐
│  Access (hito 6)  →  pide tu email antes de dejarte pasar           │
│        │                                                            │
│        ▼                                                            │
│  Worker "pom-app"  →  tu app de Next.js corriendo en Cloudflare     │
│        │  env.DB                                                    │
│        ▼                                                            │
│  D1 "pom-db"       →  la base de datos SQLite                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Conceptos

**Worker.** Código que corre en los servidores de Cloudflare, cerca de quien lo usa. No hay un servidor
encendido todo el tiempo: el Worker se ejecuta cuando llega un pedido. El plan gratis permite 100.000
pedidos por día; PoM usa unos pocos cientos.

**OpenNext.** Next.js está pensado para Vercel o un servidor Node. OpenNext es el adaptador que
convierte la app de Next en un Worker. Por eso se compila con `opennextjs-cloudflare build` y
el resultado queda en `.open-next/`.

**D1.** Base de datos SQLite administrada por Cloudflare. Gratis hasta 5 GB. Guarda un historial de
30 días (*Time Travel*): se puede volver la base a cualquier minuto de ese período.

**Binding.** Así se conecta un Worker con otros recursos de Cloudflare. En `wrangler.jsonc`
declaramos `"binding": "DB"` y en el código aparece como `env.DB`. No hay contraseñas ni URLs
de conexión: Cloudflare conecta las piezas por dentro.

**Wrangler.** La herramienta de línea de comandos de Cloudflare (`npx wrangler ...`). Con ella se crea
la base, se aplican migraciones, se consulta y se publica. Su configuración es `wrangler.jsonc`.

**Local vs. remoto.** Casi todos los comandos de Wrangler funcionan en dos modos:
- `--local`: usa una copia de D1 en tu PC (carpeta `.wrangler/`). Ideal para probar sin miedo.
- `--remote`: usa la base real en Cloudflare.

**Migración.** Un archivo SQL numerado en `migrations/` que cambia el esquema de la base.
Wrangler recuerda cuáles ya aplicó y solo aplica las nuevas.

**Access (Zero Trust).** Una puerta delante de la app: antes de entrar pide tu email y te manda un
código. Solo pasan los emails que vos autorices. Gratis hasta 50 usuarios. Lo configuramos en el hito 6.

## Puesta en marcha (una sola vez)

1. **Iniciar sesión** desde la carpeta del proyecto:
   ```bash
   npx wrangler login
   ```
   Se abre el navegador; aprobás el acceso. Para verificar: `npx wrangler whoami`.

2. **Crear la base** en Cloudflare:
   ```bash
   npx wrangler d1 create pom-db
   ```
   Devuelve un `database_id`. Va en `wrangler.jsonc`, dentro de `d1_databases`.

3. **Aplicar las migraciones** a la base remota:
   ```bash
   npm run db:migrate:remote
   ```

4. **Publicar** la app:
   ```bash
   npm run deploy
   ```
   La primera vez Cloudflare te pide elegir un subdominio `*.workers.dev`.

## Uso diario

| Quiero… | Comando |
| -- | -- |
| Programar con recarga automática | `npm run dev` |
| Probar exactamente como en Cloudflare | `npm run preview` |
| Ver los datos reales | `npx wrangler d1 execute pom-db --remote --command "SELECT ..."` |
| Publicar una nueva versión | `npm run deploy` |
| Ver logs en vivo de producción | `npx wrangler tail` |
| Volver la base a un momento anterior | `npx wrangler d1 time-travel restore pom-db --timestamp=<ISO>` |

## En el dashboard (dash.cloudflare.com)

- **Compute → Workers & Pages → pom-app**: versiones, logs, métricas y dominio.
- **Storage & databases → D1 → pom-db**: ver tablas, correr SQL desde el navegador y ver *Time Travel*.
- **Zero Trust → Access → Applications**: dónde se protege la URL (hito 6).

## Límites a tener en cuenta

- **Cache Components** de Next.js está desactivado porque no funciona bien en Workers.
- Las pantallas leen la base en cada pedido, sin caché: es lo correcto para datos personales que cambian todo el tiempo.
- Sin Access, cualquiera que tenga la URL puede leer y escribir. No compartirla hasta el hito 6.

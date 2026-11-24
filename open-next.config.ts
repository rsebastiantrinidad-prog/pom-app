// Configuración del adaptador OpenNext (Next.js → Cloudflare Workers).
// Sin caché incremental: la app muestra datos personales que cambian todo el tiempo.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});

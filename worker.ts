// Worker propio: el de OpenNext (la app Next.js) + la alarma de fin de bloque (PER-106).
// @ts-ignore -- lo genera `opennextjs-cloudflare build` (puede no existir antes del primer build)
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,
} satisfies ExportedHandler<CloudflareEnv>;

export { PomAlarm } from "./src/worker/pom-alarm";

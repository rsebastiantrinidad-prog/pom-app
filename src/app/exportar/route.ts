import { connection } from "next/server";
import { zipFiles } from "@/lib/backup";
import { exportTablesCsv } from "@/lib/db/backup";
import { getPomDay } from "@/lib/pom";

/**
 * Copia de seguridad (PER-111): descarga un .zip con un CSV por tabla.
 * Lo protege Cloudflare Access, como el resto de la app.
 */
export async function GET() {
  await connection(); // siempre los datos del momento, nunca una versión pregenerada
  const tables = await exportTablesCsv();
  const enc = new TextEncoder();
  const zip = zipFiles(tables.map((t) => ({ name: t.name, data: enc.encode(t.csv) })));
  const day = getPomDay(new Date());
  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="pom-copia-${day}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

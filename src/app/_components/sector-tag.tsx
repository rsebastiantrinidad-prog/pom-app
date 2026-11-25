import { SECTOR_LABELS, type Sector } from "@/lib/pom";

const DOT: Record<Sector, string> = {
  estudio: "bg-sector-estudio",
  personal: "bg-sector-personal",
  dbp: "bg-sector-dbp",
};

/** Nombre del sector con su color de la paleta. */
export function SectorTag({ sector, className = "" }: { sector: Sector; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden className={`size-2 rounded-full ${DOT[sector]}`} />
      {SECTOR_LABELS[sector]}
    </span>
  );
}

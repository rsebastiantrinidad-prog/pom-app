// Logos de Driven By People extraídos en vector del Manual de identidad (public/brand).
// Regla del manual: no se recolorean ni se deforman. En modo oscuro se usa la
// versión blanca oficial para mantener el contraste.

export function BrandIsotipo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/brand/dbp-isotipo-blanco.svg" media="(prefers-color-scheme: dark)" />
      <img src="/brand/dbp-isotipo.svg" alt="Driven by People" className={className} />
    </picture>
  );
}

export function BrandLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/brand/dbp-logo-horizontal-blanco.svg" media="(prefers-color-scheme: dark)" />
      <img src="/brand/dbp-logo-horizontal.svg" alt="Driven by People" className={className} />
    </picture>
  );
}

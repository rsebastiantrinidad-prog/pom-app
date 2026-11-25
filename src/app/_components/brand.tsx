/* eslint-disable @next/next/no-img-element -- SVG de marca chicos: next/image no aporta acá. */
// Logos de Driven By People extraídos en vector del Manual de identidad (public/brand).
// Regla del manual: no se recolorean ni se deforman. En tema oscuro se usa la
// versión blanca oficial para mantener el contraste (sigue el tema elegido en la app).

export function BrandIsotipo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <>
      <img src="/brand/dbp-isotipo.svg" alt="Driven by People" className={`${className} dark:hidden`} />
      <img src="/brand/dbp-isotipo-blanco.svg" alt="Driven by People" className={`${className} hidden dark:block`} />
    </>
  );
}

export function BrandLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <>
      <img src="/brand/dbp-logo-horizontal.svg" alt="Driven by People" className={`${className} dark:hidden`} />
      <img src="/brand/dbp-logo-horizontal-blanco.svg" alt="Driven by People" className={`${className} hidden dark:block`} />
    </>
  );
}

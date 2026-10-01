import { builtinManufacturerLogo } from "@guntan/config/manufacturer-logos";

/** Panelden girilen logo (`custom`) hazır logoya göre önceliklidir. */
export function manufacturerLogoUrl(name: string | null | undefined, custom?: string | null): string | null {
  if (!name) return null;
  return custom || builtinManufacturerLogo(name);
}

export function ManufacturerLogo({
  name,
  src: custom,
  className,
  height = 22,
}: {
  name: string | null | undefined;
  src?: string | null;
  className?: string;
  height?: number;
}) {
  if (!name) return null;
  const src = manufacturerLogoUrl(name, custom);
  if (!src) return <span className={className}>{name}</span>;
  return (
    <span className={`${className ?? ""} mfr-logo`.trim()} title={name}>
      {/* eslint-disable-next-line @next/next/no-img-element -- küçük statik logolar, optimizasyona gerek yok */}
      <img src={src} alt={name} height={height} loading="lazy" decoding="async" style={{ height, width: "auto" }} />
    </span>
  );
}

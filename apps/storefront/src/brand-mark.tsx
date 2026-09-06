import Image from "next/image";

export function BrandMark({
  name,
  logoUrl,
  size = 34,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <Image
        className="brand-mark"
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        sizes={`${size}px`}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="brand-mark brand-mark-fallback" style={{ width: size, height: size }} aria-hidden>
      {initials}
    </span>
  );
}

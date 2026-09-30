"use client";

import { useState } from "react";

function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR");
}

export function BrandLogo({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="brand-logo" style={{ width: size, height: size }}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span style={{ fontSize: Math.max(10, size * 0.3) }}>{initials(name)}</span>
      )}
    </span>
  );
}

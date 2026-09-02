import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/brands");
mkdirSync(dir, { recursive: true });

function svg(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="32" fill="#fff"/>
  ${inner}
</svg>`;
}

function mono(letter, color = "#111") {
  return svg(`<text x="32" y="40" text-anchor="middle" font-family="Arial Black, Helvetica, sans-serif" font-size="26" font-weight="800" fill="${color}">${letter}</text>`);
}

const logos = {
  "alfa-romeo": svg(`
    <circle cx="32" cy="32" r="24" fill="#fff" stroke="#111" stroke-width="2"/>
    <path d="M32 10 A22 22 0 0 1 32 54 Z" fill="#c8102e"/>
    <path d="M32 10 A22 22 0 0 0 32 54 Z" fill="#fff"/>
    <circle cx="32" cy="32" r="7" fill="#111"/>
    <path d="M32 18 v28 M22 32 h20" stroke="#fff" stroke-width="2.4"/>
  `),
  audi: svg(`
    <g fill="none" stroke="#111" stroke-width="3.2">
      <circle cx="16" cy="32" r="10"/><circle cx="27" cy="32" r="10"/>
      <circle cx="38" cy="32" r="10"/><circle cx="49" cy="32" r="10"/>
    </g>
  `),
  bmw: svg(`
    <circle cx="32" cy="32" r="24" fill="#1c1c1c"/>
    <circle cx="32" cy="32" r="18" fill="#fff"/>
    <path d="M32 14 A18 18 0 0 1 50 32 L32 32 Z" fill="#0066b1"/>
    <path d="M32 50 A18 18 0 0 1 14 32 L32 32 Z" fill="#0066b1"/>
  `),
  cadillac: svg(`<path d="M8 34 L32 14 L56 34 L48 38 L32 24 L16 38 Z" fill="#a4873a"/><rect x="20" y="38" width="24" height="6" rx="1" fill="#111"/>`),
  chevrolet: svg(`<path d="M8 32 L20 20 H44 L56 32 L44 44 H20 Z" fill="#d4a017" stroke="#111" stroke-width="1.5"/><rect x="26" y="26" width="12" height="12" fill="#fff"/>`),
  chrysler: svg(`<path d="M12 40 L32 14 L52 40 H12 Z" fill="#1a365d"/><text x="32" y="36" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="Arial">C</text>`),
  citroen: svg(`<path d="M12 36 L32 18 L52 36 L44 36 L32 26 L20 36 Z" fill="#e4002b"/><path d="M12 46 L32 28 L52 46 L44 46 L32 36 L20 46 Z" fill="#e4002b"/>`),
  cupra: svg(`<circle cx="32" cy="32" r="22" fill="#111"/><text x="32" y="40" text-anchor="middle" font-size="18" font-weight="800" fill="#c5a572" font-family="Arial">C</text>`),
  dacia: svg(`<rect x="10" y="22" width="44" height="20" rx="10" fill="#0b6b3a"/><text x="32" y="37" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">DACIA</text>`),
  daewoo: mono("DW", "#0a3d8f"),
  daihatsu: svg(`<path d="M32 12 L52 50 H12 Z" fill="#e10600"/>`),
  dodge: svg(`<path d="M8 30 H40 L52 22 H56 L44 34 H8 Z" fill="#c8102e"/><path d="M8 36 H36 L48 28" fill="none" stroke="#111" stroke-width="2"/>`),
  fiat: svg(`<rect x="8" y="22" width="48" height="20" rx="10" fill="#c8102e"/><text x="32" y="37" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="Arial">FIAT</text>`),
  ford: svg(`<ellipse cx="32" cy="32" rx="26" ry="16" fill="#003478"/><text x="32" y="38" text-anchor="middle" font-size="14" font-style="italic" font-weight="800" fill="#fff" font-family="Arial">Ford</text>`),
  honda: svg(`<rect x="12" y="16" width="40" height="32" rx="6" fill="#e10600"/><text x="32" y="40" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="Arial">H</text>`),
  hyundai: svg(`<ellipse cx="32" cy="32" rx="24" ry="18" fill="#002c5f"/><text x="32" y="40" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="Arial">H</text>`),
  infiniti: svg(`<path d="M32 12 L44 50 H20 Z" fill="none" stroke="#111" stroke-width="3"/><path d="M24 36 H40" stroke="#111" stroke-width="3"/>`),
  jaguar: svg(`<path d="M10 40 C18 18 30 14 46 20 C40 24 36 28 50 36 C34 32 22 38 10 40 Z" fill="#111"/>`),
  jeep: svg(`<rect x="8" y="24" width="48" height="16" rx="2" fill="#111"/><text x="32" y="37" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" letter-spacing="1" font-family="Arial">JEEP</text>`),
  kia: svg(`<rect x="8" y="22" width="48" height="20" rx="10" fill="#bb162b"/><text x="32" y="37" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="Arial">KIA</text>`),
  lancia: svg(`<ellipse cx="32" cy="32" rx="24" ry="16" fill="#003da5"/><path d="M18 32 H46 M32 18 V46" stroke="#c5a572" stroke-width="3"/>`),
  "land-rover": svg(`<ellipse cx="32" cy="32" rx="26" ry="16" fill="#0b6b3a"/><text x="32" y="30" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="Arial">LAND</text><text x="32" y="42" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="Arial">ROVER</text>`),
  lincoln: svg(`<rect x="12" y="20" width="40" height="24" fill="#111"/><path d="M20 32 H44" stroke="#c5a572" stroke-width="3"/>`),
  mazda: svg(`<path d="M32 10 C44 22 50 34 50 46 H14 C14 34 20 22 32 10 Z" fill="#111"/><path d="M32 16 L40 44 H24 Z" fill="#fff"/>`),
  mercedes: svg(`
    <circle cx="32" cy="32" r="22" fill="none" stroke="#111" stroke-width="3"/>
    <path d="M32 12 L38 40 L32 36 L26 40 Z" fill="#111"/>
    <path d="M32 36 L14 44 L32 32 L50 44 Z" fill="#111"/>
  `),
  mini: svg(`<ellipse cx="32" cy="32" rx="26" ry="14" fill="#111"/><text x="32" y="37" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Arial">MINI</text>`),
  mitsubishi: svg(`<path d="M32 12 L40 26 H24 Z" fill="#e10600"/><path d="M14 38 L22 24 L30 38 Z" fill="#e10600"/><path d="M34 38 L42 24 L50 38 Z" fill="#e10600"/>`),
  nissan: svg(`<ellipse cx="32" cy="32" rx="26" ry="16" fill="none" stroke="#c8102e" stroke-width="4"/><rect x="12" y="28" width="40" height="8" rx="2" fill="#c8102e"/>`),
  opel: svg(`<circle cx="32" cy="32" r="22" fill="#f3c300"/><path d="M18 34 L28 22 H34 L30 30 H46 L36 42 H30 L34 34 Z" fill="#111"/>`),
  peugeot: svg(`<path d="M20 44 C20 22 32 12 32 12 C32 12 44 22 44 44 H20 Z" fill="#002a5c"/><circle cx="26" cy="28" r="2" fill="#c5a572"/><circle cx="38" cy="28" r="2" fill="#c5a572"/>`),
  porsche: svg(`<rect x="18" y="10" width="28" height="44" rx="4" fill="#c8102e"/><rect x="18" y="10" width="28" height="14" fill="#111"/><text x="32" y="42" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="Arial">P</text>`),
  proton: mono("P", "#0a3d8f"),
  renault: svg(`<path d="M32 8 L54 32 L32 56 L10 32 Z" fill="#ffcc00" stroke="#111" stroke-width="2"/>`),
  rover: svg(`<circle cx="32" cy="32" r="22" fill="#0b6b3a"/><text x="32" y="38" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="Arial">ROVER</text>`),
  saab: svg(`<circle cx="32" cy="32" r="22" fill="#1a365d"/><text x="32" y="38" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Arial">SAAB</text>`),
  seat: svg(`<circle cx="32" cy="32" r="22" fill="#c8102e"/><text x="32" y="40" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="Arial">S</text>`),
  skoda: svg(`<circle cx="32" cy="32" r="22" fill="#4ba82e"/><path d="M20 36 L32 16 L36 28 H46 L34 50 L30 36 Z" fill="#fff"/>`),
  smart: svg(`<circle cx="32" cy="32" r="22" fill="#111"/><text x="32" y="38" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">smart</text>`),
  ssangyong: svg(`<circle cx="32" cy="32" r="22" fill="#111"/><text x="32" y="30" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="Arial">SSANG</text><text x="32" y="42" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="Arial">YONG</text>`),
  subaru: svg(`
    <circle cx="32" cy="32" r="22" fill="#003087"/>
    <g fill="#fff"><circle cx="32" cy="18" r="3"/><circle cx="22" cy="24" r="2.4"/><circle cx="42" cy="24" r="2.4"/><circle cx="24" cy="36" r="2.4"/><circle cx="40" cy="36" r="2.4"/></g>
  `),
  suzuki: svg(`<path d="M44 16 H24 C16 16 16 28 24 28 H40 C48 28 48 40 40 40 H20" fill="none" stroke="#e10600" stroke-width="6" stroke-linecap="round"/>`),
  toyota: svg(`
    <ellipse cx="32" cy="36" rx="22" ry="14" fill="none" stroke="#eb0a1e" stroke-width="3"/>
    <ellipse cx="32" cy="32" rx="10" ry="18" fill="none" stroke="#eb0a1e" stroke-width="3"/>
    <ellipse cx="32" cy="32" rx="4" ry="10" fill="none" stroke="#eb0a1e" stroke-width="2"/>
  `),
  volkswagen: svg(`
    <circle cx="32" cy="32" r="22" fill="#001e50"/>
    <path d="M18 24 L26 44 L32 30 L38 44 L46 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/>
  `),
  volvo: svg(`
    <circle cx="32" cy="32" r="22" fill="none" stroke="#003057" stroke-width="3"/>
    <text x="32" y="38" text-anchor="middle" font-size="11" font-weight="800" fill="#003057" font-family="Arial">VOLVO</text>
    <circle cx="48" cy="16" r="4" fill="none" stroke="#003057" stroke-width="2"/>
  `),
};

for (const [slug, content] of Object.entries(logos)) {
  writeFileSync(join(dir, `${slug}.svg`), content);
}
console.log(`Wrote ${Object.keys(logos).length} brand logos to ${dir}`);

const MFR_LOGOS: Record<string, string> = {
  AISIN: "aisin.png",
  AKZONOBEL: "akzonobel.png",
  BARUM: "barum.png",
  BERU: "beru.png",
  BORGWARNER: "borgwarner.png",
  BOSCH: "bosch.png",
  BRIDGESTONE: "bridgestone.png",
  BRIGESTONE: "bridgestone.png",
  CASTROL: "castrol.png",
  CONTINENTAL: "continental.png",
  CONTINEN: "continental.png",
  CONTITECH: "contitech.png",
  DAYCO: "dayco.png",
  DELPHI: "delphi.png",
  DENSO: "denso.png",
  EXEDY: "exedy.png",
  FAG: "fag.png",
  FEDERAL: "federal-mogul.png",
  GARRETT: "garrett.png",
  GKN: "gkn.png",
  LÖBROGKN: "gkn.png",
  HELLA: "hella.png",
  HENKEL: "henkel.png",
  IHI: "ihi.png",
  INA: "ina.png",
  KORMORAN: "kormoran.png",
  KYB: "kyb.png",
  LESJOFORS: "lesjofors.png",
  LUKOIL: "lukoil.png",
  "M.MARELLI": "magneti-marelli.jpg",
  MAHLE: "mahle.png",
  MANDO: "mando.png",
  MANN: "mann.png",
  MATADOR: "matador.png",
  MICHELIN: "michelin.png",
  MITSUBISHI: "mitsubishi.png",
  MOBIS: "mobis.png",
  NGK: "ngk.png",
  "NTN-SNR": "ntn.png",
  SNR: "ntn.png",
  OSRAM: "osram.png",
  PPG: "ppg.png",
  SACHS: "sachs.png",
  "SACHS YA": "sachs.png",
  SHELL: "shell.png",
  SKF: "skf.png",
  STABILUS: "stabilus.png",
  TIMKEN: "timken.png",
  TOTAL: "total.png",
  TRW: "trw.png",
  VALEO: "valeo.png",
  PHCVALEO: "valeo.png",
  VDO: "vdo.png",
  VITESCO: "vitesco.png",
  WAHLER: "wahler.jpg",
  WURTH: "wurth.png",
  ZF: "zf.png",
};

/** Orijinal (OE/IOE) parçaların üreticisi araç markasının kendisi; mevcut araç logoları kullanılır. */
const OE_BRAND_LOGOS: Record<string, string> = {
  PSA: "peugeot.png",
  FD: "ford.png",
  OPEL: "opel.png",
  VW: "volkswagen.png",
  BMW: "bmw.png",
  HYU: "hyundai.png",
  LAND: "land-rover.png",
  RENAULT: "renault.png",
  MB: "mercedes.png",
  FIAT: "fiat.png",
};

function normalizeName(name: string): string {
  return name
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/[-\s](D|T)$/, "")
    .replace(/\.+$/, "")
    .replace(/\s+/g, " ");
}

export function manufacturerLogoUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = normalizeName(name);
  const oe = key.match(/^I?OE-(.+)$/);
  if (oe) {
    const file = OE_BRAND_LOGOS[oe[1]!];
    return file ? `/brands/${file}` : null;
  }
  const file = MFR_LOGOS[key];
  return file ? `/manufacturers/${file}` : null;
}

export function ManufacturerLogo({
  name,
  className,
  height = 22,
}: {
  name: string | null | undefined;
  className?: string;
  height?: number;
}) {
  if (!name) return null;
  const src = manufacturerLogoUrl(name);
  if (!src) return <span className={className}>{name}</span>;
  return (
    <span className={`${className ?? ""} mfr-logo`.trim()} title={name}>
      {/* eslint-disable-next-line @next/next/no-img-element -- küçük statik logolar, optimizasyona gerek yok */}
      <img src={src} alt={name} height={height} loading="lazy" decoding="async" style={{ height, width: "auto" }} />
    </span>
  );
}

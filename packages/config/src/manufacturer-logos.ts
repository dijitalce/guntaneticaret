const MFR_LOGOS: Record<string, string> = {
  AISIN: "aisin.png",
  AKZONOBEL: "akzonobel.png",
  AYD: "ayd.svg",
  AYFAR: "ayfar.png",
  BARUM: "barum.png",
  BERU: "beru.png",
  BORGWARNER: "borgwarner.png",
  BOSCH: "bosch.png",
  BREMI: "bremi.png",
  BRIDGESTONE: "bridgestone.png",
  BRIGESTONE: "bridgestone.png",
  BSG: "bsg.svg",
  CASTROL: "castrol.png",
  CHAMPION: "champion.png",
  CONTINENTAL: "continental.png",
  CONTINEN: "continental.png",
  CONTITECH: "contitech.png",
  DAYCO: "dayco.png",
  DELPHI: "delphi.png",
  DENSO: "denso.png",
  DEPO: "depo.png",
  EUROREPAR: "eurorepar.svg",
  EXEDY: "exedy.png",
  FAE: "fae.svg",
  FAG: "fag.png",
  FEBI: "febi.svg",
  FEDERAL: "federal-mogul.png",
  FERODO: "ferodo.png",
  FILTRON: "filtron.svg",
  GARRETT: "garrett.png",
  GKN: "gkn.png",
  LÖBROGKN: "gkn.png",
  GOODYEAR: "goodyear.png",
  HELLA: "hella.png",
  HENKEL: "henkel.png",
  HEPU: "hepu.svg",
  IBRAS: "ibras.png",
  IHI: "ihi.png",
  INA: "ina.png",
  KENTPAR: "kentpar.png",
  KIBI: "kibi.webp",
  KING: "king.png",
  KORMORAN: "kormoran.png",
  KS: "kolbenschmidt.svg",
  KYB: "kyb.png",
  LESJOFORS: "lesjofors.png",
  LUKOIL: "lukoil.png",
  "M.MARELLI": "magneti-marelli.jpg",
  MAHER: "maher.png",
  MAHLE: "mahle.png",
  MANDO: "mando.png",
  MANN: "mann.png",
  MATADOR: "matador.png",
  MICHELIN: "michelin.png",
  MITSUBISHI: "mitsubishi.png",
  MOBIS: "mobis.png",
  MOOG: "moog.png",
  NGK: "ngk.png",
  NRF: "nrf.webp",
  "NTN-SNR": "ntn.png",
  SNR: "ntn.png",
  OPAR: "opar.webp",
  OSRAM: "osram.png",
  OZGAYD: "ozgayd.png",
  PIERBURG: "pierburg.svg",
  PPG: "ppg.png",
  RAPRO: "rapro.svg",
  SACHS: "sachs.png",
  "SACHS YA": "sachs.png",
  SAKURA: "sakura.png",
  SHELL: "shell.png",
  SKF: "skf.png",
  SKT: "skt.svg",
  STABILUS: "stabilus.png",
  SWAG: "swag.svg",
  TEKNOROT: "teknorot.png",
  TEXTAR: "textar.webp",
  TIMKEN: "timken.png",
  TOPRAN: "topran.svg",
  TOTAL: "total.png",
  TRW: "trw.png",
  TURTEL: "turtel.png",
  UFI: "ufi.png",
  VALEO: "valeo.png",
  PHCVALEO: "valeo.png",
  VDO: "vdo.png",
  VITESCO: "vitesco.png",
  WAHLER: "wahler.jpg",
  WURTH: "wurth.png",
  YENMAK: "yenmak.png",
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

/** Panelden yüklenen logolar vitrinde bu yoldan servis edilir. */
export const MANUFACTURER_LOGO_ROUTE = "/uretici-logo";

/** Yüklenen logo dosyası `logo_url` sütununda data URI olarak durur (TEXT: 64 KB). */
export const MANUFACTURER_LOGO_MAX_BYTES = 45 * 1024;

/** Depoyla birlikte gelen hazır logo (vitrinin public klasöründe). */
export function builtinManufacturerLogo(name: string | null | undefined): string | null {
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


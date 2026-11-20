import { SEO_CATEGORIES, seoCategoryParentSlug } from "@guntan/types";

/**
 * Tedarikçi kategori göndermediğinde ürün adından kategori çıkarır ("ÖN FREN BALATASI …" → fren-balatasi).
 * Hedefler mevcut /kategori/<slug> adresleridir; ad ve üst grup SEO haritasından, haritada olmayanlar EXTRA'dan gelir.
 * Emin olunamayan adlar (lastik, kod gibi adlar, döşeme vb.) kategorisiz bırakılır: yanlış kategori boş kategoriden kötüdür.
 */
export type InferredCategory = { slug: string; name: string; parentSlug: string | null; parentName: string | null };

/** SEO haritasında olmayan ama katalogda kullanılan (ya da bu dosyanın açtığı) kategoriler. */
export const EXTRA_CATEGORY_PARENTS: Record<string, { name: string; parent: string | null }> = {
  "fren-aksami-muhtelif": { name: "Fren Parçaları", parent: "fren-aksami" },
  "motor-aksami": { name: "Motor Aksamı", parent: "motor" },
  "kece-aksami": { name: "Keçeler", parent: "motor" },
  kasnak: { name: "Kasnaklar", parent: "motor" },
  enjektor: { name: "Enjektörler", parent: "motor" },
  egzoz: { name: "Egzoz Parçaları", parent: "motor" },
  "bagaj-kapagi": { name: "Bagaj Kapakları", parent: "kaporta" },
  "isitma-intcooler-yag-rad": { name: "Intercooler ve Yağ Soğutucular", parent: "sogutma" },
  burc: { name: "Burçlar", parent: "alt-takim" },
  koruk: { name: "Körükler", parent: "alt-takim" },
  "viraj-lastigi": { name: "Viraj Lastikleri", parent: "alt-takim" },
  "z-rot": { name: "Z Rotlar", parent: "alt-takim" },
  kaucuk: { name: "Kauçuk Parçalar", parent: null },
  hortum: { name: "Hortumlar", parent: "kaucuk" },
  takoz: { name: "Takozlar", parent: "kaucuk" },
  "kapi-aksami": { name: "Kapı Aksamı", parent: "kaporta" },
  "bakalit-aksami": { name: "Bakalit ve İç Kaplama", parent: "kaporta" },
  "tel-aksami": { name: "Teller", parent: null },
  rulman: { name: "Rulmanlar", parent: null },
};

/** Sıra önceliktir: özel ifade genelden önce gelir ("AMORTİSÖR KÖRÜĞÜ" amortisörden, "KAPAK CONTASI" kapaktan önce). */
const RULES: Array<[slug: string, pattern: RegExp]> = [
  // Kimyasallar
  ["antifriz", /\bANTIFI?RIZ/],
  ["dot-fren-hidrolik", /\bFREN HIDROLI[GK]|\bDOT ?[345]\b/],
  ["balata-sprey", /\bBALATA (TEMIZLE|SPREY)/],
  ["motor-ve-sanz-yag", /\b(MOTOR|SANZ[IU]MAN|DISLI) YAGI\b|\b\d{1,2}W-?\d{2}\b/],

  // Filtreler
  ["yag-filtresi", /\bYAG FILTRE/],
  ["hava-filtresi", /\bHAVA FILT/],
  ["polen-filtresi", /\b(POLEN|KABIN|KLIMA) FILTRE/],
  ["yakit-filtresi", /\b(YAKIT|MAZOT|BENZIN) FILTRE/],

  // Conta ve keçe: taşıdığı parçanın kuralından önce
  ["conta-sibop-lastik", /\bCONTA|\bGASKET|\bSU[BP]AP LASTI|\bSIBOP LASTI/],
  ["kece-aksami", /\bKECE(SI|LERI|SIZ)?\b/],

  // Hortumlar
  ["fren-hortumu", /\bFRE[NM] HORTUM/],
  ["motor-su-hortumu", /\b(RADYATOR|KALORIFER|DEVIRDAIM|TERMOSTAT|GENLESME|SU)( \w+){0,2} (HORTUM|BORU)/],
  ["hortum", /\bHORTUM/],

  // Fren
  ["fren-aksami-muhtelif", /\bBALATA (IKAZ|FISI|SENSOR|KABLO)|\bIKAZ KONTAGI/],
  ["abs-sensor", /\bABS\b.*\bSENSOR(?!LU)|\bABS HIZ|\bTEKER(LEK)? (HIZ|DEVIR) SENSOR|\bABS KABLO/],
  ["fren-balatasi", /\bBALATA/],
  ["fren-diski", /\bFREN DISK|\bDISK FREN\b|\bBRAKE DISC/],
  ["kaliper", /\bKALIPER/],
  ["fren-deb-merkez", /\b(FREN|DEBRIYAJ)( \w+)? MERKEZ|\bMERKEZI? (ALT|UST)\b|\bMASTER CYLINDER/],
  ["tel-aksami", /\b(EL FRENI?|FREN|GAZ|KAPUT|VITES|KILOMETRE|KAPI( \w+){0,2}) TELI?\b|\bTEL EL FREN/],
  ["debriyaj-teli", /\bDEBRIYAJ TELI?\b/],
  ["fren-aksami-muhtelif", /\bFREN\b|\bKAMPANA/],

  // Triger ve kayış
  ["zincir-seti", /\b(TRIGER|EKSANTRIK|EGZANTRIK) ZINCIR|\bZINCIR (SETI?|KITI?|TAKIM)/],
  ["triger-seti-eksantrik", /\bTRIGER (SETI?|KITI?|TAKIM)/],
  ["triger-kayisi", /\bTRIGER( KAYIS)?/],
  ["rl-gergi-kasnak", /\bGERGI( \w+)? KASNA|\bRULMANLI KASNAK/],
  ["rl-gergi", /\bGERGI (RULMAN|KUTUGU)|\bKAYIS GERGI|\bGERGISI\b|\b(TRIGER|EKSANTRIK|ALTERNATOR|ZINCIR)( \w+)? GERGI/],
  ["kanalli-kayis", /\bKAYIS/],
  ["kasnak", /\bKASNA[KG]/],

  // Debriyaj ve şanzıman
  ["motor-takozu", /\b(MOTOR|SANZ[IU]MAN) TAKOZ|\bTAKOZ MOTOR/],
  ["rl-debriyaj", /\bDEBRIYAJ RULMAN/],
  ["debriyaj-catali", /\bDEBRIYAJ CATAL/],
  ["debriyaj-seti", /\bDEBRIYAJ (SETI?|TAKIM|KITI?|BASKI)|\bBASKI( \w+)? DISK|\bCLUTCH KIT/],
  ["volan", /\bVOLAN\b/],
  ["sanzuman-muhtelif", /\bDEBRIYAJ|\bSANZ[IU]MAN|\bSENKROMEC|\bVITES/],

  // Sensör ve elektrik
  ["hava-akis-sensor", /\bHAVA (AKIS|KUTLE)|\bMAF SENSOR|\bDEBIMETRE/],
  ["musur-role", /\bMUSUR(?!LU)|\bROLE(SI)?\b/],
  ["sensor", /\bSENSOR(?!LU)|\bLAMBDA|\bOKSIJEN/],
  ["depo-samandira", /\bSAMANDIRA/],
  ["yakit-otomatigi", /\b(YAKIT|BENZIN|MAZOT) (POMPA|OTOMATI|BESLEME)|\bDEPO ICI( \w+)? POMPA/],

  // Ateşleme
  ["kizdirma-bujisi", /\b(KIZDIRMA|ISITMA) BUJI/],
  ["buji-kablosu", /\bBUJI KABLO/],
  ["bobin-modul", /\bBOBIN/],
  ["atesleme-bujisi", /\bBUJI(SI|LERI)?\b/],

  // Alt takım ve direksiyon
  ["burc", /\bBURC/],
  ["bagaj-amortisoru", /\b(KAPUT|BAGAJ)( \w+)? AMORTISOR/],
  ["amortisor-kule-rulman", /\bAMORTISOR (KORU[GK]|TAKOZ|RULMAN|KULE|LASTI|TOZLU)|\bKULE RULMAN/],
  ["amortisor", /\bAMORTISOR|\bSHOCK ABSORBER|\bSOK EMICI/],
  ["salincak", /\bSALINCAK|\bDENGE KOLU/],
  ["helezon-yayi", /\bHELEZON/],
  ["rotil", /\bROTIL/],
  ["rot-basi", /\bROT ?BASI?\b/],
  ["z-rot", /\bZ[ -]?ROT|\bVIRAJ ASKI|\bASKI ROTU/],
  ["rot-kolu", /\bROT (KOLU|MILI)|\bROTMILI/],
  ["viraj-lastigi", /\bVIRAJ( \w+)? LASTI/],
  ["direksiyon-kutusu", /\bDIREKSIYON KUTU/],
  ["direksiyon-pompa", /\bDIREKS\w* POMPA|\bHIDROLIK POMPA/],
  ["direksiyon", /\bDIREKSIYON|\bSTEERING/],
  ["teker-poryasi", /\bPORYA|\bTEKER(LEK)? GOBE/],
  ["rl-teker-kit", /\b(TEKER|AKS) RULMAN|\bRULMAN KITI?\b|\bWHEEL BEARING/],
  ["koruk", /\bKORU[GK]/],
  ["aks-grubu", /\bAKS (KAFA|KOMPLE|MILI|GRUBU)|\bKOMPLE AKS\b/],
  ["takoz", /\bTAKOZ/],

  // Soğutma, klima ve ısıtma
  ["isitma-klima-kompresor", /\bKLIMA KOMPRES/],
  ["isitma-klima-rad", /\bKLIMA RADYATOR|\bKONDENSER/],
  ["isitma-kalorifer-rad", /\bKALORIFER RADYATOR/],
  ["isitma-intcooler-yag-rad", /\bINTERCOOLER|\bINTERKOL|\bYAG (SOGUTUCU|RADYATOR)/],
  ["depo-radyator-kapak", /\bRADYATOR( \w+)? KAPA[GK]|\bDEPO KAPA[GK]|\bGENLESME (KAVANOZ|DEPO)/],
  ["isitma-fan-termigi", /\bFAN (TERMI|MOTOR)|\bRADYATOR FAN/],
  ["isitma-su-rad", /\bRADYATOR/],
  ["isitma-devirdaim", /\bDEVIRDAIM|\bSU POMPASI|\bWATER PUMP/],
  ["isitma-termostat", /\bTERMOSTAT/],
  ["isitma-fan-rad-klima", /\bKLIMA|\bKALORIFER/],

  // Motor
  ["segman", /\bSEGMAN/],
  ["piston", /\bPISTON/],
  ["silindir-kapagi", /\bSILINDIR KAPA[GK]/],
  ["supap", /\bSU[BP]A[BP]/],
  ["yag-pompasi", /\bYAG POMPA/],
  ["turbo", /\bTURBO/],
  ["eksantrik-mili", /\b(EKSANTRIK|EGZANTRIK|EKSANTIRIK) (MIL|DISLI)/],
  ["krank", /\b[KG]RANK\b/],
  ["enjektor", /\bENJEKTOR/],
  ["motor-aksami", /\bKARTER|\bEMME MANIFOLD|\bEGZOZ MANIFOLD|\bGAZ KELEBE|\bROLANTI|\b(ANA|KOL) YATAK|\bGOMLEK/],
  ["egzoz", /\bSUSTURUCU|\bEGZO[ZS]/],
  ["sarj-mars-dinamosu", /\bMARS (MOTOR|DINAMO)|\bALTERNATOR|\bSARJ DINAMO|\bJENERATOR/],

  // Aydınlatma
  ["sis-fari", /\bSIS FAR/],
  ["stop-lambasi", /\bSTOP( LAMBA)?\b/],
  ["ampul", /\bAMPUL\b/],
  ["far", /\bFAR(I|LAR)?\b/],

  // Kaporta ve dış donanım
  ["camurluk-davlumbazi", /\bDAVLUMBAZ/],
  ["camurluk", /\bCAMURLUK/],
  ["tampon", /\bTAMPON/],
  ["panjur", /\bPANJUR/],
  ["kaput", /\bKAPUT/],
  ["bagaj-kapagi", /\bBAGAJ KAPA[GK]I\b/],
  ["ayna", /\bAYNA/],
  ["cam-krikosu", /\bCAM KRIKO/],
  ["kapi-kolu", /\bKAPI( \w+)? KOLU/],
  ["bakalit-aksami", /\bBAKALIT/],
  ["kapi-aksami", /\bKAPI\b/],

  // Diğer
  ["silecek", /\bSILECEK/],
  ["rulman", /\bRULMAN/],
];

/** Büyük harfe çevirir, Türkçe harfleri sadeleştirir, ayraçları boşluğa indirger. */
function fold(value: string) {
  return value
    .toLocaleUpperCase("tr-TR")
    .replace(/[İIı]/g, "I")
    .replaceAll("Ş", "S")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .replace(/[^A-Z0-9/-]+/g, " ")
    .trim();
}

function describe(slug: string): { name: string; parent: string | null } {
  const seo = SEO_CATEGORIES[slug];
  if (seo) return { name: seo.name, parent: seoCategoryParentSlug(seo) ?? null };
  const extra = EXTRA_CATEGORY_PARENTS[slug];
  if (!extra) throw new Error(`Tanımsız kategori: ${slug}`);
  return extra;
}

export function inferCategory(productName: string): InferredCategory | null {
  const text = fold(productName);
  if (!text) return null;
  const hit = RULES.find(([, pattern]) => pattern.test(text));
  if (!hit) return null;
  const { name, parent } = describe(hit[0]);
  return { slug: hit[0], name, parentSlug: parent, parentName: parent ? describe(parent).name : null };
}

/** Kuralların hedeflediği bütün kategoriler; tanımsız bir slug modül yüklenirken hata verir. */
export const INFERRED_CATEGORIES = [...new Set(RULES.map(([slug]) => slug))].map((slug) => {
  const { name, parent } = describe(slug);
  return { slug, name, parentSlug: parent, parentName: parent ? describe(parent).name : null };
});

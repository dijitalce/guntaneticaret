export function foldTr(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

export function formatTl(value: string | number) {
  return `${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

/** Tedarikçiden Türkçe karaktersiz gelen kategori kelimeleri (ASCII → Türkçe). */
const ASCII_TR_WORDS: Record<string, string> = {
  abs: "ABS",
  agir: "ağır",
  aksami: "aksamı",
  atesleme: "ateşleme",
  aydinlatma: "aydınlatma",
  burc: "burç",
  camurluk: "çamurluk",
  catali: "çatalı",
  cin: "çin",
  diger: "diğer",
  davlumbazi: "davlumbazı",
  dislisi: "dişlisi",
  disi: "dışı",
  dugme: "düğme",
  gomlek: "gömlek",
  isitma: "ısıtma",
  kanalli: "kanallı",
  kapagi: "kapağı",
  kapi: "kapı",
  kaucuk: "kauçuk",
  kayis: "kayış",
  kayisi: "kayışı",
  kece: "keçe",
  kizdirma: "kızdırma",
  koruk: "körük",
  lastigi: "lastiği",
  mentese: "menteşe",
  musur: "müşür",
  otomatigi: "otomatiği",
  parcalar: "parçalar",
  poryasi: "poryası",
  role: "röle",
  salincak: "salıncak",
  samandira: "şamandıra",
  sanz: "şanz",
  sanzuman: "şanzıman",
  sensor: "sensör",
  sogutma: "soğutma",
  takim: "takım",
  tasiyici: "taşıyıcı",
  termigi: "termiği",
  tirtirli: "tırtırlı",
  urun: "ürün",
  vasita: "vasıta",
  yag: "yağ",
  yakit: "yakıt",
  yayi: "yayı",
};

export function sentenceCaseTr(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  let turkish = /[ıİğüşöçĞÜŞÖÇ]/.test(trimmed);
  const lower = (turkish ? trimmed.toLocaleLowerCase("tr-TR") : trimmed.toLowerCase()).replace(
    /[a-z]+/g,
    (word, at: number, all: string) => {
      const fixed = ASCII_TR_WORDS[word];
      // Türkçe harfle bitişik parça (örn. "kayış"taki "kay") kelime değildir.
      if (!fixed || /[a-zçğıöşü]/.test(all[at - 1] ?? "") || /[a-zçğıöşü]/.test(all[at + word.length] ?? "")) return word;
      turkish = true;
      return fixed;
    },
  );
  const first = turkish ? lower.charAt(0).toLocaleUpperCase("tr-TR") : lower.charAt(0).toUpperCase();
  return first + lower.slice(1);
}

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

const ASCII_TR_FIX: Record<string, string> = {
  "fren aksami": "Fren aksamı",
  "alt takim": "Alt takım",
};

export function sentenceCaseTr(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const hasTurkish = /[ıİğüşöçĞÜŞÖÇ]/.test(trimmed);
  const lower = hasTurkish ? trimmed.toLocaleLowerCase("tr-TR") : trimmed.toLowerCase();
  const first = hasTurkish ? lower.charAt(0).toLocaleUpperCase("tr-TR") : lower.charAt(0).toUpperCase();
  const formatted = first + lower.slice(1);
  return ASCII_TR_FIX[foldTr(formatted)] ?? formatted;
}

/** Havale / EFT ödemelerinde bütün sitelerde gösterilen hesap. */
export const BANK_ACCOUNT = {
  bankName: "Garanti BBVA",
  accountHolder: "ÖMER TANRIYATAPAN",
  iban: "TR60 0006 2001 4960 0006 6624 63",
} as const;

/** İlk kurulumda yazılan yer tutucu IBAN'lar (TR00 0000 …). */
export function isPlaceholderIban(iban: string) {
  return iban.replace(/\s+/g, "").startsWith("TR000000");
}

/** Kaşedeki işletme künyesi. Mağaza adı Güntan olarak kalır. */
export const COMPANY_CONTACT = {
  legalName: "Aktan Otomotiv Yedek Parça",
  person: "Ömer Tanrıyatapan",
  lines: [
    "Bağcılar Güngören Sanayi Sitesi",
    "15. Blok No: 49",
    "Başakşehir / İstanbul",
  ],
  taxOffice: "İkitelli",
  taxId: "10397550392",
  phone: "+90 551 194 61 68",
  phoneTel: "+905511946168",
  whatsapp: "905511946168",
} as const;

export const COMPANY_ADDRESS = COMPANY_CONTACT.lines.join(", ");

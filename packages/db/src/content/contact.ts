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
  phone: "0501 637 49 28",
  phoneTel: "+905016374928",
  whatsapp: "905016374928",
  email: "info@guntanotoyedekparca.com",
  site: "www.guntanotoyedekparca.com",
  tradeName: "Güntan Oto Yedek Parça",
} as const;

export const COMPANY_ADDRESS = COMPANY_CONTACT.lines.join(", ");

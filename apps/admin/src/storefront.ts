import { adminBasePath } from "./paths";

export function storefrontUrl() {
  return (process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com").replace(/\/$/, "");
}

/**
 * Vitrin görselleri (/brands/bmw.png gibi). Canlıda admin vitrinle aynı alan adında
 * (/yonetim altında) çalıştığı için göreli adres doğrudan vitrine gider.
 */
export function assetUrl(src: string | null | undefined) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  return adminBasePath ? path : `${storefrontUrl()}${path}`;
}

/** Client bileşenlerine geçilen önek (canlıda boş). */
export function assetBase() {
  return adminBasePath ? "" : storefrontUrl();
}

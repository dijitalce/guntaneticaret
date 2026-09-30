export function storefrontUrl() {
  return (process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com").replace(/\/$/, "");
}

export function assetUrl(src: string | null | undefined) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${storefrontUrl()}${src.startsWith("/") ? "" : "/"}${src}`;
}

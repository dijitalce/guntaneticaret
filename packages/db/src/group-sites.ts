/** Tam katalog (ana site). Park domainler bu adrese yönlendirilmez; Host başlığı ile grup tenant’ına düşer. */
export const ALL_CATALOG_URL = "https://guntanotoyedekparca.com";

export const ALL_SITE = {
  slug: "guntan",
  name: "Güntan Oto Yedek Parça",
  email: "info@guntanotoyedekparca.com",
  productionHost: "guntanotoyedekparca.com",
  localHosts: ["localhost", "guntan.localhost"],
} as const;

export const GROUP_SITES = [
  {
    slug: "japon",
    name: "Japon Grup Oto Yedek Parça",
    groupSlug: "japon-grubu",
    email: "info@japongrupotoyedekparca.com",
    productionHost: "japongrupotoyedekparca.com",
    localHosts: ["japon.localhost"],
  },
  {
    slug: "alman",
    name: "Alman Grup Oto Yedek Parça",
    groupSlug: "alman-grubu",
    email: "info@almangrupotoyedekparca.com",
    productionHost: "almangrupotoyedekparca.com",
    localHosts: ["alman.localhost"],
  },
  {
    slug: "italy",
    name: "İtalyan Grup Oto Yedek Parça",
    groupSlug: "italyan-grubu",
    email: "info@italyangrupotoyedekparca.com",
    productionHost: "italyangrupotoyedekparca.com",
    localHosts: ["italy.localhost"],
  },
  {
    slug: "fransa",
    name: "Fransız Grup Oto Yedek Parça",
    groupSlug: "fransiz-grubu",
    email: "info@fransizgrupotoyedekparca.com",
    productionHost: "fransizgrupotoyedekparca.com",
    localHosts: ["fransa.localhost"],
  },
  {
    slug: "abd",
    name: "ABD Grup Oto Yedek Parça",
    groupSlug: "amerikan-grubu",
    email: "info@abdgrupotoyedekparca.com",
    productionHost: "abdgrupotoyedekparca.com",
    localHosts: ["abd.localhost"],
  },
  {
    slug: "kore",
    name: "Kore Grup Oto Yedek Parça",
    groupSlug: "kore-grubu",
    email: "info@koregrupotoyedekparca.com",
    productionHost: "koregrupotoyedekparca.com",
    localHosts: ["kore.localhost"],
  },
] as const;

export function siteHosts(site: { productionHost: string; localHosts: readonly string[] }): string[] {
  return [site.productionHost, ...site.localHosts];
}

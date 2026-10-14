import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { TenantPublicConfig } from "@guntan/types";
import { IconCard, IconCheckBadge, IconPhone, IconShield, IconTruck, IconWhatsapp } from "./icons";
import { absoluteUrl } from "./seo";

export const ABOUT = {
  company: "Aktan Otomotiv",
  shopName: "Aktan Oto Yedek Parça",
  years: 13,
  extraPhone: "+90 531 431 71 97",
  street: "İkitelli OSB Mah. Güngören Bağcılar Sanayi Sitesi 15. Blok No: 49",
  district: "Başakşehir",
  city: "İstanbul",
  photo: {
    src: "/about/aktan-oto-yedek-parca-ikitelli-basaksehir.webp",
    width: 768,
    height: 576,
    alt: "Aktan Oto Yedek Parça dükkanı – İkitelli OSB Güngören Bağcılar Sanayi Sitesi, Başakşehir / İstanbul",
  },
} as const;

const STATS = [
  { value: `${ABOUT.years}+`, label: "yıllık tecrübe" },
  { value: "150.000+", label: "ürün çeşidi" },
  { value: "500+", label: "araç markası" },
  { value: "350+", label: "ürün markası" },
];

const PROMISES = [
  { icon: <IconShield />, title: "Tamamı faturalı", text: "Sattığımız her ürün faturalıdır." },
  { icon: <IconCard />, title: "Vade farksız taksit", text: "Kredi kartına vade farksız taksit imkânı." },
  { icon: <IconTruck />, title: "Türkiye geneline kargo", text: "Anlaşmalı kargo ile her ile gönderim." },
  { icon: <IconCheckBadge />, title: "Şase numarasıyla doğru parça", text: "Uyumu şase numaranızla birlikte kontrol ediyoruz." },
];

export const ABOUT_FULL_ADDRESS = `${ABOUT.street}, ${ABOUT.district} / ${ABOUT.city}`;

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${ABOUT.shopName}, Güngören Bağcılar Sanayi Sitesi 15. Blok No 49, İkitelli OSB, ${ABOUT.district}, ${ABOUT.city}`,
)}`;

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function phones(tenant: TenantPublicConfig) {
  const list = [tenant.phone, ABOUT.extraPhone].filter((p): p is string => Boolean(p));
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = p.replace(/\D/g, "").slice(-10);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ShopPhoto({ priority = false }: { priority?: boolean }) {
  return (
    <figure className="about-photo">
      <Image
        src={ABOUT.photo.src}
        alt={ABOUT.photo.alt}
        width={ABOUT.photo.width}
        height={ABOUT.photo.height}
        sizes="(max-width: 900px) 100vw, 560px"
        loading={priority ? "eager" : "lazy"}
      />
      <span className="about-photo-badge">
        <b>{ABOUT.years}+</b>
        <span>yıldır<br />sektörde</span>
      </span>
      <figcaption>Dükkanımız · İkitelli OSB, {ABOUT.district} / {ABOUT.city}</figcaption>
    </figure>
  );
}

function AboutStats() {
  return (
    <ul className="about-stats">
      {STATS.map((s) => (
        <li key={s.label}>
          <b>{s.value}</b>
          <span>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

function AboutContact({ tenant }: { tenant: TenantPublicConfig }) {
  return (
    <div className="about-contact">
      <address>
        <strong>{ABOUT.shopName}</strong>
        <span>{ABOUT_FULL_ADDRESS}</span>
        <a href={MAPS_URL} target="_blank" rel="noreferrer">Yol tarifi al →</a>
      </address>
      <div className="about-actions">
        {tenant.whatsapp ? (
          <a
            className="btn btn-whatsapp"
            href={`https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent("Merhaba, parça hakkında bilgi almak istiyorum.")}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconWhatsapp /> WhatsApp
          </a>
        ) : null}
        {phones(tenant).map((p) => (
          <a key={p} className="btn btn-secondary" href={telHref(p)}>
            <IconPhone /> {p}
          </a>
        ))}
      </div>
    </div>
  );
}

export function HomeAbout({ tenant }: { tenant: TenantPublicConfig }) {
  return (
    <section className="home-about" aria-labelledby="home-about-title">
      <ShopPhoto />
      <div className="about-body">
        <span className="rail-eyebrow">Hakkımızda</span>
        <h2 id="home-about-title">
          {ABOUT.company}: {ABOUT.years} yılı aşkın tecrübeyle orijinal ve kaliteli oto yedek parça
        </h2>
        <p>
          {tenant.siteName}, İstanbul İkitelli OSB&apos;deki Güngören Bağcılar Sanayi Sitesi&apos;nde hizmet veren{" "}
          <strong>{ABOUT.company}</strong>&apos;in online yedek parça mağazasıdır. {ABOUT.years} yılı aşkın süredir
          sektördeyiz; tecrübeli kadromuzla aracınıza uyumlu orijinal ve kaliteli yedek parçayı en uygun fiyatla
          sunuyoruz.
        </p>
        <p>
          Kendi aracımıza takmayacağımız hiçbir parçayı size satmıyoruz. Gözünüz gibi baktığınız aracınızın parçaları
          güvenilir ellerden, müşteri memnuniyeti ön planda tutularak tedarik edilir.
        </p>
        <AboutStats />
        <ul className="about-promises">
          {PROMISES.map((p) => (
            <li key={p.title}>
              <span className="about-promise-icon">{p.icon}</span>
              <span>
                <b>{p.title}</b>
                {p.text}
              </span>
            </li>
          ))}
        </ul>
        <div className="about-foot">
          <AboutContact tenant={tenant} />
          <Link className="about-more" href="/sayfa/hakkimizda">Hikâyemizi okuyun →</Link>
        </div>
      </div>
    </section>
  );
}

export function AboutPage({ tenant, extra }: { tenant: TenantPublicConfig; extra?: ReactNode }) {
  return (
    <article className="container page-surface about-page">
      <header className="about-page-head">
        <span className="rail-eyebrow">Hakkımızda</span>
        <h1>{ABOUT.company} – İkitelli&apos;de {ABOUT.years} yılı aşkın tecrübeyle oto yedek parça</h1>
        <p>En uygun fiyat ve kaliteli hizmetin tek adresi: orijinal yedek parça, faturalı satış, Türkiye geneline kargo.</p>
      </header>
      <div className="about-page-grid">
        <ShopPhoto priority />
        <div className="about-body cms-prose">
          <p>
            {ABOUT.company} ailesi olarak {ABOUT.years} yılı aşkın süredir oto yedek parça sektöründe, tecrübeli kadromuzla
            hizmet veriyoruz. {tenant.siteName}, İstanbul {ABOUT.district}&apos;teki İkitelli OSB Güngören Bağcılar Sanayi
            Sitesi&apos;nde bulunan dükkanımızın online yedek parça mağazasıdır.
          </p>
          <p>
            Kendi aracımıza takmayacağımız hiçbir yedek parçayı size vermeyiz; bundan gönül rahatlığıyla emin olabilirsiniz.
            Gözünüz gibi baktığınız aracınızın yedek parça tedariği en güvenilir kişiler tarafından sağlanır. Müşteri
            memnuniyetini ön planda tutar, olabilecek en uygun fiyatı almanızı sağlarız. Zoru başararak en kaliteli ürünleri
            en uygun fiyata getirdiğimize şahit olmak isterseniz bir telefon kadar yakınınızdayız.
          </p>
          <AboutStats />
        </div>
      </div>

      <div className="about-page-sections cms-prose">
        <section>
          <h2>Sitede bulamadığınız parçalar için bize ulaşın</h2>
          <p>
            Sitemizde yer almayan 150.000&apos;den fazla ürün, 500&apos;ün üzerinde araç markası ve 350&apos;den fazla ürün
            markasıyla geniş bir yelpazeye sahibiz. Aradığınız parçayı sitede göremiyorsanız lütfen bizimle iletişime
            geçin; ürün hakkında detaylı bilgi vermekten memnuniyet duyarız.
          </p>
        </section>
        <section>
          <h2>Doğru parça için şase numaranızı paylaşın</h2>
          <p>
            Doğru parça teminatı için şase (şasi) numaranızla birlikte bizimle irtibata geçmeniz bizi memnun eder. Parçanın
            aracınıza uyumunu OEM numarası ve şase numarası üzerinden kontrol ederek size gönderiyoruz.
          </p>
        </section>
        <section>
          <h2>Faturalı ürün, vade farksız taksit</h2>
          <p>
            Ürünlerimizin tamamı faturalıdır. Kredi kartına vade farksız taksit imkânımız mevcuttur. Güncel stok bilgisi
            için lütfen bizimle iletişime geçin.
          </p>
        </section>
        <section>
          <h2>Türkiye&apos;nin her yerine kargo</h2>
          <p>
            Anlaşmalı kargo firmamız ile Türkiye&apos;nin her yerine gönderim yapıyoruz. Kargo ücreti alıcıya aittir.
          </p>
        </section>
      </div>

      {extra}

      <section className="about-page-contact" aria-labelledby="about-contact-title">
        <h2 id="about-contact-title">Adresimiz ve iletişim</h2>
        <AboutContact tenant={tenant} />
      </section>
    </article>
  );
}

/** Yerel SEO için mağaza bilgisi (schema.org AutoPartsStore). */
export function autoPartsStoreJsonLd(tenant: TenantPublicConfig, host: string, sameAs?: string[]) {
  const logo = tenant.logoUrl
    ? /^https?:\/\//i.test(tenant.logoUrl) ? tenant.logoUrl : absoluteUrl(host, tenant.logoUrl)
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "@id": `${absoluteUrl(host, "/")}#store`,
    name: tenant.siteName,
    alternateName: [ABOUT.company, ABOUT.shopName],
    description: `${ABOUT.company}: ${ABOUT.years} yılı aşkın tecrübeyle İstanbul İkitelli OSB'de orijinal ve kaliteli oto yedek parça. Faturalı satış, vade farksız taksit, Türkiye geneline kargo.`,
    url: absoluteUrl(host, "/"),
    logo,
    image: absoluteUrl(host, ABOUT.photo.src),
    telephone: tenant.phone ?? ABOUT.extraPhone,
    email: tenant.email ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: ABOUT.street,
      addressLocality: ABOUT.district,
      addressRegion: ABOUT.city,
      addressCountry: "TR",
    },
    areaServed: { "@type": "Country", name: "Türkiye" },
    contactPoint: phones(tenant).map((p) => ({
      "@type": "ContactPoint",
      telephone: p,
      contactType: "customer service",
      areaServed: "TR",
      availableLanguage: "Turkish",
    })),
    paymentAccepted: "Kredi kartı, Havale/EFT",
    currenciesAccepted: "TRY",
    sameAs,
  };
}

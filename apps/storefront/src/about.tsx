import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { TenantPublicConfig } from "@guntan/types";
import { COMPANY_CONTACT } from "@guntan/db/content/contact";
import {
  IconBolt,
  IconCard,
  IconCheckBadge,
  IconLock,
  IconParts,
  IconPhone,
  IconReturn,
  IconShield,
  IconWhatsapp,
} from "./icons";
import { MISSING_PART_CATALOG, SLOGAN } from "./assurance";
import { absoluteUrl } from "./seo";

export const ABOUT = {
  shopName: "Aktan Oto Yedek Parça",
  years: 6,
  team: 10,
  street: "İkitelli OSB Mah. Bağcılar Güngören Sanayi Sitesi 15. Blok No: 49",
  district: "Başakşehir",
  city: "İstanbul",
  photo: {
    src: "/about/aktan-oto-yedek-parca-ikitelli-basaksehir.webp",
    width: 768,
    height: 576,
    alt: "Aktan Oto Yedek Parça dükkanı – Bağcılar Güngören Sanayi Sitesi 15. Blok No: 49, İkitelli / İstanbul",
  },
} as const;

export function aboutMeta(siteName: string) {
  return {
    title: `Hakkımızda | ${siteName} – ${SLOGAN}`,
    description: `${siteName}: ${ABOUT.years} yıllık tecrübe ve ${ABOUT.team} kişilik ekiple Bağcılar Güngören Sanayi Sitesi, İstanbul'dan A'dan Z'ye tüm marka ve modellere oto yedek parça. Faturalı satış, kredi kartına 12 taksit, Türkiye geneline kargo.`,
  };
}

const STATS = [
  { value: `${ABOUT.years}+`, label: "yıllık sektör tecrübesi" },
  { value: `${ABOUT.team}`, label: "kişilik uzman ekip" },
  { value: `${MISSING_PART_CATALOG}+`, label: "tedarik edilebilir ürün" },
  { value: "A'dan Z'ye", label: "marka ve model" },
];

const PROMISES = [
  { icon: <IconShield />, title: "Güvenmediğimiz parçayı satmayız", text: "Kendi aracımıza takmayacağımız hiçbir parçayı size sunmayız." },
  { icon: <IconCheckBadge />, title: "Doğru parça, titiz kontrol", text: "Uyumu OEM ve şasi numaranızla kontrol ederiz." },
  { icon: <IconBolt />, title: "Söz verilen zamanda gönderim", text: "Stoktaki ürünler aynı gün kargoda, takip no SMS ile." },
  { icon: <IconCard />, title: "Faturalı ve güvenli alışveriş", text: "Her ürün faturalı; kredi kartına 12 taksit, 3D Secure." },
];

const VALUES: { title: string; body: ReactNode[] }[] = [
  {
    title: "Kendi Aracımıza Takmayacağımız Parçayı Müşterimize Sunmayız!",
    body: [
      <>
        Kalite anlayışımız çok net: <strong>kendi aracımıza takmayacağımız hiçbir parçayı müşterimize sunmayız.</strong>{" "}
        Ürün seçiminde kaliteyi, araçla uyumluluğu ve müşteri memnuniyetini ön planda tutuyor; her siparişi titizlikle
        değerlendirerek yanlış parça riskini en aza indiriyoruz.
      </>,
      "Çünkü satın aldığınız bir yedek parça yalnızca bir ürün değil; aracınıza, yol güvenliğinize ve bize duyduğunuz güvene yapılan bir yatırımdır.",
    ],
  },
  {
    title: "Doğru Parça İçin Titiz, Her Siparişte Dikkatliyiz.",
    body: [
      "Araç ve parça uyumluluğuna önem veriyoruz. İhtiyacınızı doğru anlamak için OEM numarası ve şasi numarası üzerinden uyumu kontrol ediyor, size uygun ürünü bulmak için çalışıyoruz.",
      <>
        Aradığınız parça sitemizde görünmüyor mu? Endişelenmeyin! Sitemizde listelenmeyen{" "}
        <strong>{MISSING_PART_CATALOG}+ ürüne</strong> tedarik ağımız üzerinden ulaşabiliyoruz. Parça adı, OEM ya da şasi
        numaranızla bize yazmanız yeterli.
      </>,
    ],
  },
  {
    title: "Hızlı Geri Dönüş, Söz Verilen Zamanda Gönderim.",
    body: [
      "Zamanın sizin için ne kadar değerli olduğunu biliyoruz. Sorularınıza en kısa sürede dönüş yapıyor, stoktaki ürünleri aynı gün kargoya veriyor, tedarikli siparişlerde ise size bildirdiğimiz gönderim tarihine sadık kalıyoruz.",
      "Verilen söz, müşterimize duyduğumuz saygının bir parçasıdır. Siparişinizin her aşamasında açık iletişim kurar, sizi bilgilendiririz; kargo takip numaranız SMS ve e-posta ile iletilir.",
    ],
  },
  {
    title: "Sizin Sorununuz, Bizim Sorumluluğumuz.",
    body: [
      "Müşterilerimizi bir sipariş numarasından ibaret görmüyoruz. Karşılaştığınız bir sorunu kendi sorunumuz gibi ele alıyor, çözüm üretmek için üzerimize düşeni yapıyoruz.",
      "Müşteri memnuniyeti bizim için satışla bitmez. Sipariş öncesinden satış sonrasına kadar yanınızdayız: 14 gün içinde iade hakkınız saklıdır, hata bizden kaynaklanıyorsa hiçbir masraf ödemezsiniz.",
    ],
  },
  {
    title: `${ABOUT.years} Yıllık Tecrübe, ${ABOUT.team} Kişilik Ekip, Tek Bir Hedef.`,
    body: [
      `Geride bıraktığımız ${ABOUT.years} yılda edindiğimiz tecrübeyi ${ABOUT.team} kişilik ekibimizin emeği ve özverisiyle birleştiriyoruz. Her müşterimize aynı özenle yaklaşıyor, hizmet kalitemizi sürekli geliştiriyoruz.`,
      "Hedefimiz yalnızca bugünkü ihtiyacınızı karşılamak değil; yarın yedek parça ihtiyacınız olduğunda ilk aklınıza gelen adres olmaktır.",
    ],
  },
];

const TRUST = [
  {
    icon: <IconParts />,
    title: "Gerçek dükkan, gerçek ekip",
    text: `Bağcılar Güngören Sanayi Sitesi 15. Blok No: 49'daki dükkanımızda ${ABOUT.team} kişilik ekibimizle hizmet veriyoruz.`,
  },
  {
    icon: <IconShield />,
    title: "Faturalı satış",
    text: `Sattığımız her ürün faturalıdır. Vergi dairesi: ${COMPANY_CONTACT.taxOffice} · VKN: ${COMPANY_CONTACT.taxId}`,
  },
  { icon: <IconLock />, title: "Güvenli ödeme", text: "Garanti BBVA 3D Secure altyapısı, kredi kartına 12 taksit ve havale/EFT." },
  { icon: <IconReturn />, title: "14 gün iade hakkı", text: "Orijinal ambalajında, kullanılmamış ürünlerde teslimattan itibaren 14 gün." },
];

export const ABOUT_FULL_ADDRESS = `${ABOUT.street}, ${ABOUT.district} / ${ABOUT.city}`;

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${ABOUT.shopName}, Bağcılar Güngören Sanayi Sitesi 15. Blok No 49, İkitelli OSB, ${ABOUT.district}, ${ABOUT.city}`,
)}`;

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
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
      <figcaption>Dükkanımız · Bağcılar Güngören Sanayi Sitesi, {ABOUT.city}</figcaption>
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
        {tenant.phone ? (
          <a className="btn btn-secondary" href={telHref(tenant.phone)}>
            <IconPhone /> {tenant.phone}
          </a>
        ) : null}
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
          {tenant.siteName}: {SLOGAN}
        </h2>
        <p className="about-lead">Bizim için yedek parça satmak değil, güven kazanmak önemlidir.</p>
        <p>
          {tenant.siteName} olarak {ABOUT.years} yıllık sektör tecrübemiz ve {ABOUT.team} kişilik ekibimizle İstanbul
          Bağcılar Güngören Sanayi Sitesi&apos;nden Türkiye&apos;nin her yerine güvenilir, hızlı ve çözüm odaklı oto yedek
          parça hizmeti sunuyoruz. A&apos;dan Z&apos;ye tüm marka ve modeller için doğru parçayı bulmaktan teslimata kadar
          her aşamada yanınızdayız.
        </p>
        <p>
          Kalite anlayışımız çok net: <strong>kendi aracımıza takmayacağımız hiçbir parçayı müşterimize sunmayız.</strong>
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
          <Link className="about-more" href="/sayfa/hakkimizda">Hikâyemizi ve değerlerimizi okuyun →</Link>
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
        <h1>
          {tenant.siteName}
          <span className="about-slogan">{SLOGAN}</span>
        </h1>
        <p className="about-lead">Bizim için yedek parça satmak değil, güven kazanmak önemlidir.</p>
      </header>
      <div className="about-page-grid">
        <ShopPhoto priority />
        <div className="about-body cms-prose">
          <p>
            {tenant.siteName} olarak {ABOUT.years} yıllık sektör tecrübemiz ve {ABOUT.team} kişilik ekibimizle otomotiv
            yedek parça sektöründe güvenilir, hızlı ve çözüm odaklı hizmet sunuyoruz.
          </p>
          <p>
            A&apos;dan Z&apos;ye farklı marka ve model araçların yedek parça ihtiyaçlarına yönelik geniş ürün seçeneklerimizle
            aradığınız parçaya en doğru şekilde ulaşmanızı sağlıyoruz. Bizim için iş yalnızca parça satmakla bitmiyor; doğru
            parçayı bulmaktan siparişin teslimatına kadar her aşamada yanınızda olmak en önemli önceliğimiz.
          </p>
          <AboutStats />
        </div>
      </div>

      <div className="about-values">
        {VALUES.map((v, i) => (
          <section key={v.title} className="about-value">
            <span className="about-value-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <h2>{v.title}</h2>
            {v.body.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </section>
        ))}
      </div>

      <section className="about-trust" aria-labelledby="about-trust-title">
        <h2 id="about-trust-title">Neden gönül rahatlığıyla alışveriş yapabilirsiniz?</h2>
        <ul>
          {TRUST.map((t) => (
            <li key={t.title}>
              <span className="about-promise-icon">{t.icon}</span>
              <span>
                <b>{t.title}</b>
                {t.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <blockquote className="about-closing">
        <p>
          {tenant.siteName} olarak <strong>kaliteyi ürünlerimizde, güveni sözümüzde, memnuniyeti ise yaptığımız işte</strong>{" "}
          yaşatıyoruz. Bizi tercih ettiğinizde yalnızca bir yedek parça tedarikçisiyle değil, ihtiyacınızı önemseyen ve
          çözüm için yanınızda olan bir ekiple çalışırsınız.
        </p>
        <footer>— {ABOUT.shopName}</footer>
      </blockquote>

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
    alternateName: [ABOUT.shopName, COMPANY_CONTACT.legalName],
    slogan: SLOGAN,
    description: aboutMeta(tenant.siteName).description,
    url: absoluteUrl(host, "/"),
    logo,
    image: absoluteUrl(host, ABOUT.photo.src),
    telephone: tenant.phone ?? COMPANY_CONTACT.phone,
    email: tenant.email ?? undefined,
    taxID: COMPANY_CONTACT.taxId,
    numberOfEmployees: { "@type": "QuantitativeValue", value: ABOUT.team },
    address: {
      "@type": "PostalAddress",
      streetAddress: ABOUT.street,
      addressLocality: ABOUT.district,
      addressRegion: ABOUT.city,
      addressCountry: "TR",
    },
    areaServed: { "@type": "Country", name: "Türkiye" },
    contactPoint: tenant.phone
      ? [{ "@type": "ContactPoint", telephone: tenant.phone, contactType: "customer service", areaServed: "TR", availableLanguage: "Turkish" }]
      : undefined,
    paymentAccepted: "Kredi kartı, Havale/EFT",
    currenciesAccepted: "TRY",
    sameAs,
  };
}

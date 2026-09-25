import Link from "next/link";

export const IADE_TITLE = "İade ve Değişim Politikası";

const highlights = [
  {
    title: "İade Süresi",
    lead: "14 Gün",
    text: "Ürünün size teslim edilmesinden itibaren 14 gün içinde iade hakkınız bulunur.",
    icon: "calendar",
  },
  {
    title: "Ürün Koşulu",
    lead: null,
    text: "Kullanılmamış, orijinal ambalajında ve tüm aksesuarları ile eksiksiz olmalıdır.",
    icon: "box",
  },
  {
    title: "Ücretsiz İade Kargosu",
    lead: null,
    text: "Güntan Oto Yedek Parça iade gönderi koduyla iadenizi kolayca gönderebilirsiniz.",
    icon: "truck",
  },
] as const;

const steps = [
  { title: "Talep", text: "Hesabınızdan veya müşteri hizmetlerinden iade talebi oluşturun." },
  { title: "Paketleme", text: "Ürünü orijinal kutusunda, eksiksiz ve zarar görmeden paketleyin." },
  { title: "Kargoya Verin", text: "İade gönderi kodu ile ürünü gönderin." },
  { title: "Kontrol & İade", text: "Ürün kontrol edildikten sonra iadeniz işleme alınır." },
];

const conditions = [
  "Ürün kullanılmamış, orijinal ambalajında ve gönderilen kutu içerisinde olmalıdır.",
  "Bant, yapışkan veya ambalaja zarar verecek dış etkenler bulunmamalı; tüm aksesuarlar eksiksiz olmalıdır.",
  "Ürün, tekrar satılabilirlik özelliğini yitirmemiş olmalıdır.",
];

const exchanges = [
  "Değişim yapılacak ürün kullanılmamış, eksiksiz ve orijinal ambalajında olmalıdır.",
  "Ürün değişiminde gidiş-dönüş kargo ücretleri müşteriye aittir.",
];

export function ReturnPolicy() {
  return (
    <article className="container page-surface return-policy">
      <nav className="breadcrumb" aria-label="Konum">
        <Link href="/">Anasayfa</Link>
        <span aria-hidden="true"> / </span>
        <span>{IADE_TITLE}</span>
      </nav>

      <header className="return-policy-head">
        <span className="return-policy-mark" aria-hidden="true">
          <PolicyIcon name="refresh" />
        </span>
        <div>
          <h1>{IADE_TITLE}</h1>
          <p>
            Müşteri memnuniyetine verdiğimiz önem doğrultusunda iade ve değişim süreçlerimizi en adil ve şeffaf
            şekilde yönetiyoruz. Güncel şartlarımız aşağıda belirtilmiştir.
          </p>
        </div>
      </header>

      <div className="return-highlights">
        {highlights.map((item) => (
          <section key={item.title} className="return-card">
            <span className="return-card-icon" aria-hidden="true">
              <PolicyIcon name={item.icon} />
            </span>
            <h2>{item.title}</h2>
            {item.lead ? <strong>{item.lead}</strong> : null}
            <p>{item.text}</p>
          </section>
        ))}
      </div>

      <section className="return-section">
        <h2>
          <PolicyIcon name="list" />
          İade Adımları
        </h2>
        <ol className="return-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="return-section">
        <h2>
          <PolicyIcon name="check" />
          İade Koşulları
        </h2>
        <ul className="return-checks">
          {conditions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="return-section">
        <h2>
          <PolicyIcon name="alert" />
          Kargo Ücreti
        </h2>
        <p className="return-note">
          Keyfi iade (ürün kusuru olmayan iade) durumlarında kargo ücreti müşteriye aittir. İade sonrasında
          siparişinizin toplam tutarı ücretsiz kargo limitinin altına düşerse, gidiş-dönüş kargo ücreti alıcıdan
          tahsil edilir.
        </p>
      </section>

      <section className="return-section">
        <h2>
          <PolicyIcon name="refresh" />
          Değişim İşlemleri
        </h2>
        <ul className="return-checks">
          {exchanges.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function PolicyIcon({ name }: { name: "refresh" | "calendar" | "box" | "truck" | "list" | "check" | "alert" }) {
  if (name === "refresh") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.3-5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "box") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 12 4 8.5M12 12l8-3.5M12 12v8" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (name === "truck") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 7h11v10H3V7Z" stroke="currentColor" strokeWidth="2" />
        <path d="M14 11h4.5L21 14.5V17h-7v-6Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="7" cy="18.5" r="1.3" fill="currentColor" />
        <circle cx="17" cy="18.5" r="1.3" fill="currentColor" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="5" cy="7" r="1.2" fill="currentColor" />
        <circle cx="5" cy="12" r="1.2" fill="currentColor" />
        <circle cx="5" cy="17" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 12.2 11 14.5 15.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.5 21 19H3L12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10v4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

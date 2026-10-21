import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconBolt,
  IconBox,
  IconCard,
  IconCheckBadge,
  IconLock,
  IconPhone,
  IconReturn,
  IconTag,
  IconTruck,
  IconWhatsapp,
} from "./icons";

export const MISSING_PART_CATALOG = "2.000.000";
export const SLOGAN = "Her Parçada Biz, Her Yolda Siz!";

export const PART_REQUEST_TEXT = "Merhaba, sitede bulamadığım bir parça arıyorum.\nAraç / şasi no:\nParça:";
export const BULK_QUOTE_TEXT = "Merhaba, toplu parça teklifi almak istiyorum.\nAraç / şasi no:\nParça listesi:";

export function whatsappHref(whatsapp: string, text: string) {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

type Assurance = { key: string; icon: ReactNode; title: string; text: string };

export function homeAssuranceItems(): Assurance[] {
  return [
    { key: "installments", icon: <IconCard />, title: "Kredi kartına 12 taksit", text: "Taksit seçenekleri ödeme adımında" },
    { key: "interest-free", icon: <IconTag />, title: "20.000+ üründe vade farksız 3 taksit", text: "Seçili ürünlerde ek ücret ödemeden" },
    { key: "free-ship", icon: <IconTruck />, title: "30.000+ üründe kargo bizden!", text: "Seçili ürünlerde kargo ücretsiz" },
    { key: "same-day", icon: <IconBolt />, title: "Aynı gün kargo", text: "Stoktaki ürünler aynı gün kargoda" },
    { key: "return", icon: <IconReturn />, title: "14 gün iade hakkı", text: "Teslimattan itibaren 14 gün içinde" },
    { key: "secure", icon: <IconLock />, title: "%100 güvenli ödeme", text: "256-bit SSL ve 3D Secure" },
  ];
}

export function assuranceItems(opts: { card?: boolean; maxInstallments?: number } = {}): Assurance[] {
  const items: Assurance[] = [
    { key: "same-day", icon: <IconBolt />, title: "Aynı gün kargo", text: "Stoktaki tüm ürünler aynı gün kargoya verilir" },
    { key: "aras", icon: <IconTruck />, title: "Aras Kargo ile uygun fiyatlı kargo", text: "Takip numarası SMS ve e-posta ile iletilir" },
    { key: "return", icon: <IconReturn />, title: "14 gün iade hakkı", text: "Teslimattan itibaren 14 gün içinde iade" },
    { key: "fit", icon: <IconCheckBadge />, title: "%100 uyumluluk garantisi", text: "Şasi numaranızla uyumu teyit ediyoruz; uymazsa iade" },
    {
      key: "secure",
      icon: <IconLock />,
      title: "%100 güvenli ödeme",
      text: opts.card ? "256-bit SSL ve 3D Secure; kart bilgileriniz saklanmaz" : "256-bit SSL ile korunan alışveriş",
    },
  ];
  if (opts.card && opts.maxInstallments && opts.maxInstallments > 1) {
    items.push({
      key: "installments",
      icon: <IconCard />,
      title: `${opts.maxInstallments} aya varan taksit`,
      text: "Kredi kartına taksit seçenekleri ödeme adımında",
    });
  }
  return items;
}

export function AssuranceGrid({
  items,
  variant = "grid",
}: {
  items: Assurance[];
  variant?: "grid" | "strip" | "list";
}) {
  return (
    <ul className={`assurance assurance-${variant}`}>
      {items.map((a) => (
        <li key={a.key}>
          <span className="assurance-icon">{a.icon}</span>
          <span>
            <strong>{a.title}</strong>
            {variant !== "list" ? <small>{a.text}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StockLine({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`stock-line${compact ? " is-compact" : ""}`}>
      <span className="stock-in">
        <span className="stock-dot" aria-hidden />
        Stokta
      </span>
      <span className="stock-ship">
        <IconBolt />
        Aynı gün kargo
      </span>
    </p>
  );
}

export function OemList({ oems, max = 6, label = "OEM" }: { oems: string[]; max?: number; label?: string }) {
  if (oems.length === 0) return null;
  const shown = oems.slice(0, max);
  const extra = oems.length - shown.length;
  return (
    <p className="oem-list">
      <span className="oem-label">{label}</span>
      {shown.map((o) => (
        <code key={o}>{o}</code>
      ))}
      {extra > 0 ? <em>+{extra}</em> : null}
    </p>
  );
}

export function ReturnTerms() {
  return (
    <div className="return-terms">
      <ul>
        <li>Teslimattan itibaren <strong>14 gün</strong> içinde iade hakkınız vardır.</li>
        <li>Ürün kullanılmamış, orijinal ambalajında ve eksiksiz olmalıdır.</li>
        <li>Aracınıza uymayan parçayı iade alır, doğru parçayla değiştiririz.</li>
        <li>İade onaylandığında ödemeniz aynı yöntemle iade edilir.</li>
      </ul>
      <Link href="/sayfa/iade">İade ve değişim koşullarının tamamı</Link>
    </div>
  );
}

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export type InstallmentRow = { count: number; total: number; monthly: number; ratePct?: number };

const CARD_PROGRAMS = [
  { key: "axess", name: "Axess" },
  { key: "bonus", name: "Bonus" },
  { key: "maximum", name: "Maximum" },
  { key: "world", name: "World" },
  { key: "paraf", name: "Paraf" },
  { key: "cardfinans", name: "CardFinans" },
  { key: "bankkart", name: "Bankkart" },
  { key: "other", name: "Diğer kartlar" },
] as const;

export function InstallmentTable({ options, minAmount }: { options: InstallmentRow[]; minAmount?: number }) {
  if (options.length <= 1) {
    return (
      <p className="installment-note muted">
        Kredi / banka kartına tek çekim veya havale / EFT ile ödeyebilirsiniz.
        {minAmount ? ` ${money(minAmount)} ve üzeri alışverişlerde taksit seçenekleri ödeme adımında açılır.` : ""}
      </p>
    );
  }
  return (
    <div className="inst">
      <ul className="inst-programs" aria-label="Taksit yapılabilen kart programları">
        {CARD_PROGRAMS.map((p) => (
          <li key={p.key} className={`card-mark is-${p.key}`}>
            {p.name}
          </li>
        ))}
      </ul>
      <div className="table-scroll">
        <table className="inst-table">
          <thead>
            <tr>
              <th scope="col">Taksit</th>
              {CARD_PROGRAMS.map((p) => (
                <th key={p.key} scope="col" className="inst-prog">
                  <span className={`card-mark is-${p.key}`}>{p.name}</span>
                </th>
              ))}
              <th scope="col" className="inst-all">Aylık</th>
              <th scope="col">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {options.map((o) => {
              const monthly = money(o.monthly);
              return (
                <tr key={o.count} className={o.count > 1 && o.ratePct === 0 ? "is-free" : undefined}>
                  <th scope="row">{o.count === 1 ? "Tek çekim" : o.count}</th>
                  {CARD_PROGRAMS.map((p) => (
                    <td key={p.key} className="inst-prog">
                      {monthly}
                    </td>
                  ))}
                  <td className="inst-all">{monthly}</td>
                  <td className="inst-total">
                    {money(o.total)}
                    {o.count > 1 && o.ratePct === 0 ? <small>Vade farksız</small> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="inst-note">
        Tutarlar aylık taksit tutarıdır ve KDV dahildir. Taksit kredi kartlarında geçerlidir; banka kartlarıyla tek
        çekim yapılır. Taksit sayısını ödeme adımında seçersiniz.
        {minAmount ? ` Taksit ${money(minAmount)} ve üzeri alışverişlerde geçerlidir.` : ""}
      </p>
    </div>
  );
}

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function MissingPartCta({
  whatsapp,
  phone,
  context,
  compact = false,
}: {
  whatsapp: string | null;
  phone: string | null;
  context?: string;
  compact?: boolean;
}) {
  if (!whatsapp && !phone) return null;
  const text = context ? `Merhaba, ${context} için parça arıyorum.` : "Merhaba, sitede bulamadığım bir parça arıyorum.";
  return (
    <section className={`missing-part${compact ? " is-compact" : ""}`} aria-label="Stokta olmayan ürünler için iletişim">
      <div>
        <strong>Aradığınız parçayı bulamadınız mı?</strong>
        <p>
          Sitemizde görünmeyen <b>{MISSING_PART_CATALOG}+ ürün</b> için bize ulaşın; OEM veya şasi numaranızla doğru parçayı
          bulup fiyat verelim.
        </p>
      </div>
      <div className="missing-part-actions">
        {whatsapp ? (
          <a
            className="btn btn-whatsapp"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconWhatsapp /> WhatsApp
          </a>
        ) : null}
        {phone ? (
          <a className="btn btn-secondary" href={telHref(phone)}>
            <IconPhone /> {phone}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function HomeQuoteBand({ whatsapp, phone }: { whatsapp: string | null; phone: string | null }) {
  if (!whatsapp && !phone) return null;
  const href = (text: string) => (whatsapp ? whatsappHref(whatsapp, text) : telHref(phone!));
  const external = whatsapp ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <section className="home-quote" aria-labelledby="home-quote-title">
      <div className="home-quote-copy">
        <span className="home-quote-slogan">{SLOGAN}</span>
        <h2 id="home-quote-title">
          Sitemizde gözükmeyen <b>{MISSING_PART_CATALOG}+</b> ürün
        </h2>
        <p>
          Aradığınız parça listede yoksa parça adı, OEM veya şasi numaranızı gönderin; tedarik ağımızdan bulup hızlıca fiyat
          verelim. Servis, usta ve filolara toplu parça teklifi hazırlıyoruz.
        </p>
      </div>
      <div className="home-quote-actions">
        <a className="btn home-quote-bulk" href={href(BULK_QUOTE_TEXT)} {...external}>
          <IconBox /> Toplu Parça Teklifi Al
        </a>
        <a className="btn btn-whatsapp" href={href(PART_REQUEST_TEXT)} {...external}>
          <IconWhatsapp /> Parçanızı bulamadınız mı?
        </a>
      </div>
    </section>
  );
}

export function PaymentMarks({ card }: { card: boolean }) {
  return (
    <div className="pay-marks" aria-label="Ödeme yöntemleri">
      {card ? (
        <>
          <span>VISA</span>
          <span>Mastercard</span>
          <span>Troy</span>
          <span>3D Secure</span>
        </>
      ) : null}
      <span>Havale / EFT</span>
      <span>
        <IconLock /> SSL
      </span>
    </div>
  );
}

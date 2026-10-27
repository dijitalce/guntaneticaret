import type { Metadata } from "next";
import { COMPANY_ADDRESS, COMPANY_CONTACT } from "@guntan/db/content/contact";
import { ContactForm } from "../../src/contact-form";
import { IconPhone, IconWhatsapp } from "../../src/icons";
import { tryGetTenant } from "../../src/tenant";

export const metadata: Metadata = {
  title: "İletişim",
  description: `Telefon ve WhatsApp: ${COMPANY_CONTACT.phone}. ${COMPANY_ADDRESS}`,
};

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default async function ContactPage() {
  const tenant = await tryGetTenant();
  const email = tenant?.email ?? COMPANY_CONTACT.email;
  const mapQuery = encodeURIComponent(`${COMPANY_CONTACT.lines.join(" ")}`);

  return (
    <div className="container page-surface contact-page">
      <header className="contact-hero">
        <h1>İletişim</h1>
        <p>Parça, sipariş veya iade için bize telefon ya da WhatsApp'tan ulaşabilirsiniz. Şasi numaranızı gönderirseniz doğru parçayı birlikte buluruz.</p>
      </header>

      <div className="contact-channels">
        <a className="contact-channel" href={`tel:${COMPANY_CONTACT.phoneTel}`}>
          <span className="contact-channel-icon"><IconPhone /></span>
          <span className="contact-channel-label">Bizi arayın</span>
          <strong>{COMPANY_CONTACT.phone}</strong>
          <span className="contact-channel-cta">Hemen ara →</span>
        </a>
        <a
          className="contact-channel is-whatsapp"
          href={`https://wa.me/${COMPANY_CONTACT.whatsapp}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="contact-channel-icon"><IconWhatsapp /></span>
          <span className="contact-channel-label">WhatsApp</span>
          <strong>{COMPANY_CONTACT.phone}</strong>
          <span className="contact-channel-cta">Mesaj yaz →</span>
        </a>
        <a className="contact-channel" href={`mailto:${email}`}>
          <span className="contact-channel-icon"><IconMail /></span>
          <span className="contact-channel-label">E-posta</span>
          <strong>{email}</strong>
          <span className="contact-channel-cta">E-posta gönder →</span>
        </a>
      </div>

      <div className="contact-grid">
        <section className="contact-panel">
          <h2>Bize yazın</h2>
          <ContactForm whatsapp={COMPANY_CONTACT.whatsapp} />
        </section>

        <section className="contact-panel contact-location">
          <h2>Adres</h2>
          <div className="contact-map">
            <iframe
              title="Harita"
              src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <address>
            <span className="contact-address-line"><IconPin /> {COMPANY_ADDRESS}</span>
          </address>
          <a
            className="btn btn-secondary contact-directions"
            href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
            target="_blank"
            rel="noreferrer"
          >
            Yol tarifi al
          </a>
          <dl className="contact-company">
            <div><dt>Unvan</dt><dd>{COMPANY_CONTACT.legalName}</dd></div>
            <div><dt>Yetkili</dt><dd>{COMPANY_CONTACT.person}</dd></div>
            <div><dt>Vergi dairesi</dt><dd>{COMPANY_CONTACT.taxOffice}</dd></div>
            <div><dt>T.C. / VKN</dt><dd>{COMPANY_CONTACT.taxId}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}

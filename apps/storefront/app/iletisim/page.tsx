import type { Metadata } from "next";
import { COMPANY_CONTACT } from "@guntan/db/content/contact";
import { tryGetTenant } from "../../src/tenant";

export const metadata: Metadata = { title: "İletişim" };

export default async function ContactPage() {
  const tenant = await tryGetTenant();
  return (
    <div className="container page-surface contact-page">
      <h1>İletişim</h1>
      <div className="contact-card">
        <address>
          <strong>{COMPANY_CONTACT.legalName}</strong>
          <span>{COMPANY_CONTACT.person}</span>
          {COMPANY_CONTACT.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
          <span className="contact-tax">
            {COMPANY_CONTACT.taxOffice} V.D. T.C.: {COMPANY_CONTACT.taxId}
          </span>
        </address>
        <p>
          <a href={`tel:${COMPANY_CONTACT.phoneTel}`}>{COMPANY_CONTACT.phone}</a>
        </p>
        <p>
          <a href={`https://wa.me/${COMPANY_CONTACT.whatsapp}`} target="_blank" rel="noreferrer">
            WhatsApp: {COMPANY_CONTACT.phone}
          </a>
        </p>
        {tenant?.email ? (
          <p>
            <a href={`mailto:${tenant.email}`}>{tenant.email}</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

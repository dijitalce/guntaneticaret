import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, customerAddresses } from "@guntan/db";
import { getCurrentCustomer } from "../../../src/customer";

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentCustomer();
  if (!user) redirect("/hesabim");

  const rows = await db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.customerId, user.id))
    .orderBy(asc(customerAddresses.title));

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Adreslerim</h2>
      </div>
      {sp.ok === "1" && <p className="account-alert is-ok" role="status">Adres kaydedildi.</p>}
      {sp.ok === "sil" && <p className="account-alert is-ok" role="status">Adres silindi.</p>}
      {sp.hata === "1" && <p className="account-alert is-bad" role="alert">Adres kaydedilemedi. Alanları kontrol et.</p>}

      {rows.length === 0 ? (
        <div className="empty-state account-empty">
          <h3>Kayıtlı adres yok</h3>
          <p>Siparişlerini hızlandırmak için teslimat adresini kaydet.</p>
        </div>
      ) : (
        <ul className="account-address-list">
          {rows.map((a) => (
            <li key={a.id} className="account-panel">
              <div className="account-address-head">
                <strong>{a.title}{a.isDefault ? " · Varsayılan" : ""}</strong>
                <form action="/api/account/addresses/delete" method="post">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn btn-ghost" type="submit">Sil</button>
                </form>
              </div>
              <p>
                {a.fullName} · {a.phone}<br />
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                {a.district} / {a.city}{a.postalCode ? ` · ${a.postalCode}` : ""}
              </p>
              {!a.isDefault && (
                <form action="/api/account/addresses/default" method="post">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn btn-secondary" type="submit">Varsayılan yap</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action="/api/account/addresses" method="post" className="account-panel" style={{ marginTop: "1rem" }}>
        <h3>Yeni adres ekle</h3>
        <label>
          Başlık
          <input className="input" name="title" placeholder="Ev, İş…" defaultValue="Adres" required />
        </label>
        <div className="account-field-row">
          <label>
            Ad soyad
            <input className="input" name="fullName" defaultValue={`${user.firstName} ${user.lastName}`} required />
          </label>
          <label>
            Telefon
            <input className="input" name="phone" type="tel" defaultValue={user.phone ?? ""} required />
          </label>
        </div>
        <div className="account-field-row">
          <label>
            İl
            <input className="input" name="city" required />
          </label>
          <label>
            İlçe
            <input className="input" name="district" required />
          </label>
        </div>
        <label>
          Adres
          <textarea name="line1" required rows={3} />
        </label>
        <label>
          Posta kodu
          <input className="input" name="postalCode" />
        </label>
        <label className="account-check">
          <input type="checkbox" name="isDefault" value="1" defaultChecked={rows.length === 0} />
          Varsayılan teslimat adresi
        </label>
        <button className="btn btn-primary" type="submit">Adresi kaydet</button>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Ödeme sırasında da yeni adres girebilirsin. <Link href="/odeme">Ödemeye git</Link>
        </p>
      </form>
    </section>
  );
}

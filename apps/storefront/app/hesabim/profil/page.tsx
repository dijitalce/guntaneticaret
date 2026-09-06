import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "../../../src/customer";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentCustomer();
  if (!user) redirect("/hesabim");

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Profil</h2>
      </div>
      {sp.ok === "1" && <p className="account-alert is-ok" role="status">Bilgilerin kaydedildi.</p>}
      {sp.hata === "sifre" && <p className="account-alert is-bad" role="alert">Mevcut şifre hatalı veya yeni şifre geçersiz.</p>}

      <div className="account-auth-grid">
        <form action="/api/account/profile" method="post" className="account-panel">
          <h3>Kişisel bilgiler</h3>
          <div className="account-field-row">
            <label>
              Ad
              <input className="input" name="firstName" defaultValue={user.firstName} required />
            </label>
            <label>
              Soyad
              <input className="input" name="lastName" defaultValue={user.lastName} required />
            </label>
          </div>
          <label>
            E-posta
            <input className="input" value={user.email} disabled readOnly />
          </label>
          <label>
            Telefon
            <input className="input" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="05xx xxx xx xx" />
          </label>
          <button className="btn btn-primary" type="submit">Kaydet</button>
        </form>

        <form action="/api/account/password" method="post" className="account-panel">
          <h3>Şifre değiştir</h3>
          <label>
            Mevcut şifre
            <input className="input" name="currentPassword" type="password" required minLength={6} autoComplete="current-password" />
          </label>
          <label>
            Yeni şifre
            <input className="input" name="newPassword" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <label>
            Yeni şifre (tekrar)
            <input className="input" name="newPasswordConfirm" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <button className="btn btn-secondary" type="submit">Şifreyi güncelle</button>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Şifreni unuttuysan destek için <Link href="/iletisim">iletişim</Link> sayfasını kullan.
          </p>
        </form>
      </div>
    </section>
  );
}

import { IconCart, IconLock, IconRefresh, IconTruck } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert } from "@/src/ui";

export const metadata = { title: "Giriş" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="login-screen">
      <aside className="login-side">
        <div className="login-brand">
          <div className="admin-brand-mark" aria-hidden>
            G
          </div>
          <div className="admin-brand-text">
            <strong style={{ color: "#fff" }}>Güntan</strong>
            <span style={{ color: "rgba(255,255,255,0.75)" }}>Yönetim paneli</span>
          </div>
        </div>
        <div>
          <h2>Siparişten kargoya tüm operasyon tek ekranda.</h2>
          <p>Satışları takip edin, siparişleri hazırlayın ve kataloğu güncel tutun.</p>
          <ul>
            <li>
              <IconCart /> Sipariş ve ödeme takibi
            </li>
            <li>
              <IconTruck /> Aras Kargo entegrasyonu
            </li>
            <li>
              <IconRefresh /> Otomatik XML stok senkronu
            </li>
          </ul>
        </div>
        <small style={{ opacity: 0.7 }}>© {new Date().getFullYear()} Güntan Ticaret</small>
      </aside>

      <div className="login-main">
        <div className="login-card">
          <h1>Giriş yap</h1>
          <p className="lede">Devam etmek için yönetici hesabınızla oturum açın.</p>
          {sp.hata === "1" && <Alert>E-posta veya şifre hatalı. Bilgileri kontrol edip tekrar deneyin.</Alert>}
          <form action={withBase("/api/login")} method="post" className="login-form">
            <label>
              E-posta
              <input className="input" name="email" type="email" placeholder="ornek@firma.com" autoComplete="username" autoFocus required />
            </label>
            <label>
              Şifre
              <input className="input" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
            </label>
            <button className="btn btn-primary" type="submit">
              <IconLock />
              Giriş yap
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

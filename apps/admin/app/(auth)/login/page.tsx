import { withBase } from "@/src/paths";

export const metadata = { title: "Giriş" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="admin-brand-mark" aria-hidden>
            G
          </div>
          <div className="admin-brand-text">
            <strong style={{ color: "#12141a" }}>Güntan Admin</strong>
            <span>Yönetim paneli</span>
          </div>
        </div>
        <h1>Hoş geldiniz</h1>
        <p className="lede">Sipariş, katalog ve site yönetimine devam etmek için giriş yapın.</p>
        {sp.hata === "1" && (
          <p className="login-alert" role="alert">
            E-posta veya şifre hatalı. Bilgileri kontrol edip tekrar deneyin.
          </p>
        )}
        <form action={withBase("/api/login")} method="post" className="login-form">
          <label>
            E-posta
            <input className="input" name="email" type="email" defaultValue="admin@guntan.local" autoComplete="username" required />
          </label>
          <label>
            Şifre
            <input className="input" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
          </label>
          <button className="btn btn-primary" type="submit">
            Giriş yap
          </button>
        </form>
      </div>
    </main>
  );
}

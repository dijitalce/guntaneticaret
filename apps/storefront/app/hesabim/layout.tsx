import { getCurrentCustomer } from "../../src/customer";
import { AccountNav } from "../../src/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentCustomer();

  if (!user) {
    return <div className="container page-surface account-page">{children}</div>;
  }

  return (
    <div className="container page-surface account-page">
      <header className="account-hero">
        <div>
          <p className="account-kicker">Hesabım</p>
          <h1>Merhaba, {user.firstName}</h1>
          <p className="muted">{user.email}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn btn-ghost" type="submit">Çıkış yap</button>
        </form>
      </header>
      <div className="account-layout">
        <AccountNav />
        <div className="account-main">{children}</div>
      </div>
    </div>
  );
}

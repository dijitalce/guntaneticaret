import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { db, orders } from "@guntan/db";
import { desc, eq } from "drizzle-orm";
import { getTenant } from "../../src/tenant";
import Link from "next/link";

export default async function AccountPage() {
  const tenant = await getTenant();
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) {
    return (
      <div className="container page-surface">
        <h1>Hesabım</h1>
        <form action="/api/auth/login" method="post" className="card" style={{ padding: "1rem", maxWidth: 360, display: "grid", gap: "0.5rem" }}>
          <input className="input" name="email" type="email" placeholder="E-posta" required />
          <input className="input" name="password" type="password" placeholder="Şifre" required />
          <button className="btn btn-primary" type="submit">Giriş</button>
        </form>
        <h2>Kayıt</h2>
        <form action="/api/auth/register" method="post" className="card" style={{ padding: "1rem", maxWidth: 360, display: "grid", gap: "0.5rem" }}>
          <input className="input" name="firstName" placeholder="Ad" required />
          <input className="input" name="lastName" placeholder="Soyad" required />
          <input className="input" name="email" type="email" placeholder="E-posta" required />
          <input className="input" name="password" type="password" placeholder="Şifre" required />
          <button className="btn btn-secondary" type="submit">Üye ol</button>
        </form>
      </div>
    );
  }
  const mine = await db.select().from(orders).where(eq(orders.customerId, user.id)).orderBy(desc(orders.createdAt)).limit(20);
  const scoped = mine.filter((o) => o.tenantId === tenant.tenant.id);
  return (
    <div className="container page-surface">
      <h1>Merhaba {user.firstName}</h1>
      <form action="/api/auth/logout" method="post"><button className="btn btn-ghost">Çıkış</button></form>
      <h2>Siparişlerim</h2>
      {scoped.map((o) => (
        <p key={o.id}><Link href={`/hesabim/siparisler/${o.id}`}>{o.orderNo}</Link> — {o.status} — {o.grandTotal} TL</p>
      ))}
    </div>
  );
}

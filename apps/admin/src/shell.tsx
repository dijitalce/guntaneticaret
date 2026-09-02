import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";

export async function requireAdmin() {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  if (!token) redirect("/login");
  const session = await getAdminBySession(token);
  if (!session) redirect("/login");
  return session;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <strong>Güntan Admin</strong>
        <Link href="/">Dashboard</Link>
        <Link href="/catalog/products">Ürünler</Link>
        <Link href="/catalog/brands">Araç markaları</Link>
        <Link href="/catalog/models">Modeller</Link>
        <Link href="/catalog/groups">Marka grupları</Link>
        <Link href="/tenants">Siteler</Link>
        <Link href="/tenants/new">Yeni site</Link>
        <Link href="/orders">Siparişler</Link>
        <Link href="/customers">Müşteriler</Link>
        <Link href="/marketing">Pazarlama</Link>
        <Link href="/content/pages">Sayfalar</Link>
        <Link href="/content/banners">Bannerlar</Link>
        <Link href="/integrations/xml">XML</Link>
        <Link href="/system/users">Kullanıcılar</Link>
        <Link href="/system/audit">Audit</Link>
        <form action="/api/logout" method="post"><button className="btn btn-ghost" style={{ color: "#fff" }}>Çıkış</button></form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}

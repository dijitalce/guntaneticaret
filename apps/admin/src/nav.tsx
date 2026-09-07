"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { withBase } from "./paths";

type NavItem = { href: string; label: string; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Genel",
    items: [{ href: "/", label: "Özet", exact: true }],
  },
  {
    label: "Katalog",
    items: [
      { href: "/catalog/products", label: "Ürünler" },
      { href: "/catalog/brands", label: "Araç markaları" },
      { href: "/catalog/models", label: "Modeller" },
      { href: "/catalog/groups", label: "Marka grupları" },
    ],
  },
  {
    label: "Siteler",
    items: [
      { href: "/tenants", label: "Tüm siteler" },
      { href: "/tenants/new", label: "Yeni site" },
    ],
  },
  {
    label: "Satış",
    items: [
      { href: "/orders", label: "Siparişler" },
      { href: "/customers", label: "Müşteriler" },
    ],
  },
  {
    label: "İçerik & büyüme",
    items: [
      { href: "/content/pages", label: "Sayfalar" },
      { href: "/content/banners", label: "Bannerlar" },
      { href: "/marketing", label: "Pazarlama" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/integrations/xml", label: "XML senkron" },
      { href: "/system/users", label: "Kullanıcılar" },
      { href: "/system/audit", label: "Audit log" },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShellClient({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  return (
    <div className={`admin-shell${open ? " nav-open" : ""}`}>
      <button type="button" className="admin-backdrop" aria-label="Menüyü kapat" onClick={() => setOpen(false)} />
      <aside className="admin-nav" aria-label="Yönetim menüsü">
        <div className="admin-brand">
          <div className="admin-brand-mark" aria-hidden>G</div>
          <div className="admin-brand-text">
            <strong>Güntan Admin</strong>
            <span>Merkezi yönetim</span>
          </div>
        </div>

        {GROUPS.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <div className="admin-nav-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${isActive(pathname, item) ? " is-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="admin-nav-foot">
          <div className="admin-user">
            <strong>{userName}</strong>
            <span>{userEmail}</span>
          </div>
          <form action={withBase("/api/logout")} method="post">
            <button className="btn-logout" type="submit">
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <button type="button" onClick={() => setOpen(true)} aria-expanded={open}>
            Menü
          </button>
          <strong>Güntan Admin</strong>
        </div>
        {children}
      </div>
    </div>
  );
}

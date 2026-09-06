"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/hesabim", label: "Özet", exact: true },
  { href: "/hesabim/siparisler", label: "Siparişlerim" },
  { href: "/hesabim/adresler", label: "Adreslerim" },
  { href: "/hesabim/profil", label: "Profil" },
  { href: "/favoriler", label: "Favoriler" },
  { href: "/sepet", label: "Sepet" },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="account-nav" aria-label="Hesap menüsü">
      {NAV.map((item) => {
        const active = "exact" in item && item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "account-nav-link is-active" : "account-nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

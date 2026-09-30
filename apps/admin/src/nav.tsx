"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { withBase } from "./paths";
import {
  IconBox,
  IconCar,
  IconCart,
  IconExternal,
  IconFile,
  IconGlobe,
  IconHome,
  IconImage,
  IconLayers,
  IconList,
  IconLogout,
  IconMegaphone,
  IconMenu,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShield,
  IconTag,
  IconUsers,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
  countKey?: "orders";
};
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { label: "Genel", items: [{ href: "/", label: "Özet", icon: IconHome, exact: true }] },
  {
    label: "Satış",
    items: [
      { href: "/orders", label: "Siparişler", icon: IconCart, countKey: "orders" },
      { href: "/customers", label: "Müşteriler", icon: IconUsers },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/catalog/products", label: "Ürünler", icon: IconBox },
      { href: "/catalog/brands", label: "Araç markaları", icon: IconCar },
      { href: "/catalog/models", label: "Modeller", icon: IconLayers },
      { href: "/catalog/groups", label: "Marka grupları", icon: IconTag },
    ],
  },
  {
    label: "Siteler",
    items: [
      { href: "/tenants", label: "Tüm siteler", icon: IconGlobe },
      { href: "/tenants/new", label: "Yeni site", icon: IconPlus },
    ],
  },
  {
    label: "İçerik ve büyüme",
    items: [
      { href: "/content/pages", label: "Sayfalar", icon: IconFile },
      { href: "/content/banners", label: "Bannerlar", icon: IconImage },
      { href: "/marketing", label: "Pazarlama", icon: IconMegaphone },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/integrations/xml", label: "XML senkron", icon: IconRefresh },
      { href: "/system/users", label: "Kullanıcılar", icon: IconShield },
      { href: "/system/audit", label: "İşlem kayıtları", icon: IconList },
    ],
  },
];

function matches(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** İç içe adreslerde (/tenants ve /tenants/new) yalnızca en uzun eşleşme seçili olur. */
function activeHref(pathname: string) {
  let best = "";
  for (const item of GROUPS.flatMap((g) => g.items)) {
    if (matches(pathname, item) && item.href.length > best.length) best = item.href;
  }
  return best;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toLocaleUpperCase("tr-TR"))
      .join("") || "A"
  );
}

export function AdminShellClient({
  children,
  userName,
  userEmail,
  storefrontUrl,
  counts,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  storefrontUrl: string;
  counts: { orders: number };
}) {
  const pathname = usePathname() || "/";
  const current = activeHref(pathname);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        if (menuRef.current) menuRef.current.open = false;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setOpen(false);
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (!q) return;
    const looksLikeOrder = /^gnt-/i.test(q) || q.includes("@");
    router.push(`${looksLikeOrder ? "/orders" : "/catalog/products"}?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={`admin-shell${open ? " nav-open" : ""}`}>
      {open ? (
        <button type="button" className="admin-backdrop" aria-label="Menüyü kapat" onClick={() => setOpen(false)} />
      ) : null}
      <aside className="admin-nav" aria-label="Yönetim menüsü">
        <Link href="/" className="admin-brand">
          <div className="admin-brand-mark" aria-hidden>
            G
          </div>
          <div className="admin-brand-text">
            <strong>Güntan</strong>
            <span>Yönetim paneli</span>
          </div>
        </Link>

        <nav className="admin-nav-scroll">
          {GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <div className="admin-nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = item.countKey ? counts[item.countKey] : 0;
                const active = current === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-link${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon />
                    {item.label}
                    {count > 0 ? (
                      <span className="admin-nav-count" title="İşlem bekleyen sipariş">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-nav-foot">
          <a href={storefrontUrl} target="_blank" rel="noreferrer">
            <IconExternal />
            Siteyi görüntüle
          </a>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-btn" onClick={() => setOpen(true)} aria-label="Menüyü aç" aria-expanded={open}>
            <IconMenu />
          </button>

          <form className="admin-search" role="search" onSubmit={onSearch}>
            <IconSearch />
            <input
              ref={searchRef}
              name="q"
              type="search"
              placeholder="Sipariş no, e-posta, SKU veya OEM ara…"
              aria-label="Ara"
              autoComplete="off"
            />
            <kbd>⌘K</kbd>
          </form>

          <div className="admin-topbar-right">
            <a className="admin-topbar-link" href={storefrontUrl} target="_blank" rel="noreferrer">
              <IconExternal />
              <span>Site</span>
            </a>
            <details className="admin-user-menu" ref={menuRef}>
              <summary aria-label="Kullanıcı menüsü">
                <span className="admin-avatar">{initials(userName)}</span>
                <span className="admin-user-name">{userName}</span>
              </summary>
              <div className="admin-user-pop">
                <div className="admin-user-pop-head">
                  <strong>{userName}</strong>
                  <span>{userEmail}</span>
                </div>
                <Link href="/system/users">
                  <IconShield />
                  Kullanıcılar
                </Link>
                <form action={withBase("/api/logout")} method="post">
                  <button type="submit" className="is-danger">
                    <IconLogout />
                    Çıkış yap
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

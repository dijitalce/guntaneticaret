import Link from "next/link";
import type { ReactNode } from "react";
import { IconBox, IconShield, IconTruck } from "./icons";

type Banner = { id: string; title: string; imageUrl: string; href: string | null };

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
    </svg>
  );
}

type Fallback = { key: string; title: string; text: string; href: string; icon: ReactNode; tone: string; external?: boolean };

function fallbacks(whatsapp: string | null): Fallback[] {
  return [
    { key: "pay", title: "Kolay ödeme", text: "Havale / EFT ile güvenli alışveriş", href: "/sayfa/mesafeli-satis", icon: <IconShield />, tone: "is-red" },
    { key: "fit", title: "Geniş parça kataloğu", text: "Parça adı, marka veya model ile ara", href: "/arama", icon: <IconBox />, tone: "is-dark" },
    { key: "ship", title: "Hızlı tedarik", text: "Siparişin özenle paketlenip kargoya verilir", href: "/arama", icon: <IconTruck />, tone: "is-amber" },
    whatsapp
      ? { key: "help", title: "Parça danışmanı", text: "WhatsApp'tan yaz, doğru parçayı bulalım", href: `https://wa.me/${whatsapp}`, icon: <IconChat />, tone: "is-green", external: true }
      : { key: "help", title: "Parça danışmanı", text: "Doğru parçayı birlikte bulalım", href: "/iletisim", icon: <IconChat />, tone: "is-green" },
  ];
}

export function HomeSideBanners({ banners, whatsapp }: { banners: Banner[]; whatsapp: string | null }) {
  const defaults = fallbacks(whatsapp);
  const slots = Array.from({ length: 4 }, (_, i) => banners[i] ?? defaults[i]!);
  return (
    <aside className="home-side" aria-label="Kampanyalar ve avantajlar">
      {slots.map((s) =>
        "imageUrl" in s ? (
          <Link key={s.id} href={s.href || "/arama"} className="home-side-item is-image">
            <img src={s.imageUrl} alt={s.title} loading="eager" />
          </Link>
        ) : (
          <a
            key={s.key}
            href={s.href}
            className={`home-side-item is-card ${s.tone}`}
            {...(s.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <span className="home-side-icon">{s.icon}</span>
            <span className="home-side-text">
              <strong>{s.title}</strong>
              <small>{s.text}</small>
            </span>
          </a>
        ),
      )}
    </aside>
  );
}

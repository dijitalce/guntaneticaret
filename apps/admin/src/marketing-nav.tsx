import { TabNav } from "./ui-ext";

const ITEMS = [
  { key: "summary", label: "Özet", href: "/marketing" },
  { key: "campaigns", label: "Kampanyalar", href: "/marketing/campaigns" },
  { key: "automations", label: "Otomasyonlar", href: "/marketing/automations" },
  { key: "segments", label: "Segmentler", href: "/marketing/segments" },
  { key: "popups", label: "Popup'lar", href: "/marketing/popups" },
  { key: "coupons", label: "Kuponlar", href: "/marketing/coupons" },
  { key: "settings", label: "Ayarlar", href: "/marketing/settings" },
];

export function MarketingNav({ active }: { active: string }) {
  return <TabNav label="Pazarlama bölümleri" active={active} items={ITEMS} />;
}

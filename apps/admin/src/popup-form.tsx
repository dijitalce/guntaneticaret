import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, tenants, type Popup, type PopupInput } from "@guntan/db";
import { text } from "./api-helpers";
import { withBase } from "./paths";
import { Toggle } from "./ui-ext";

const trDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });

function dateInput(d: Date | null) {
  return d ? trDate.format(new Date(d)) : "";
}

export function popupFromForm(form: FormData): PopupInput | { error: string } {
  const name = text(form, "name").slice(0, 191);
  const title = text(form, "title").slice(0, 255);
  if (!name || !title) return { error: "Popup adı ve başlığı zorunlu." };
  const kind = text(form, "kind");
  const trigger = text(form, "trigger_type");
  const pages = text(form, "pages");
  const device = text(form, "device");
  const clamp = (v: string, min: number, max: number, d: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  const start = text(form, "starts_at");
  const end = text(form, "ends_at");
  return {
    tenant_id: text(form, "tenant_id") || null,
    name,
    kind: kind === "announcement" || kind === "coupon" ? kind : "newsletter",
    title,
    body: text(form, "body").slice(0, 2000) || null,
    image_url: text(form, "image_url").slice(0, 1000) || null,
    cta_text: text(form, "cta_text").slice(0, 120) || null,
    cta_url: text(form, "cta_url").slice(0, 1000) || null,
    coupon_code: text(form, "coupon_code").toUpperCase().slice(0, 64) || null,
    trigger_type: trigger === "exit" || trigger === "scroll" ? trigger : "delay",
    delay_sec: clamp(text(form, "delay_sec"), 0, 300, 8),
    scroll_pct: clamp(text(form, "scroll_pct"), 5, 100, 50),
    pages: pages === "home" || pages === "product" || pages === "category" ? pages : "all",
    device: device === "mobile" || device === "desktop" ? device : "all",
    frequency_days: clamp(text(form, "frequency_days"), 0, 365, 7),
    is_active: form.get("is_active") === "1" ? 1 : 0,
    starts_at: start ? new Date(`${start}T00:00:00+03:00`) : null,
    ends_at: end ? new Date(`${end}T23:59:59+03:00`) : null,
  };
}

export async function PopupForm({ popup }: { popup?: Popup }) {
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const p = popup;
  return (
    <form action={withBase(p ? `/api/popups/${p.id}` : "/api/popups")} method="post" className="form-stack">
      <input type="hidden" name="_action" value="save" />
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-name">Popup adı (yalnızca panelde)</label>
          <input className="input" id="p-name" name="name" required defaultValue={p?.name ?? ""} placeholder="Örn. Bülten kaydı %10" />
        </div>
        <div className="field">
          <label htmlFor="p-tenant">Site</label>
          <select className="select" id="p-tenant" name="tenant_id" defaultValue={p?.tenant_id ?? ""}>
            <option value="">Tüm siteler</option>
            {tenantRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Tür</label>
        <div className="choice-grid is-3">
          {[
            { v: "newsletter", l: "Bülten kaydı", h: "E-posta toplar, pazarlama listesine ekler" },
            { v: "coupon", l: "Kupon", h: "E-posta karşılığı kupon kodu gösterir" },
            { v: "announcement", l: "Duyuru", h: "Başlık, metin ve bir buton" },
          ].map((o) => (
            <label key={o.v} className="choice">
              <input type="radio" name="kind" value={o.v} defaultChecked={(p?.kind ?? "newsletter") === o.v} />
              <span>
                <strong>{o.l}</strong>
                <small>{o.h}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="p-title">Başlık</label>
        <input className="input" id="p-title" name="title" required defaultValue={p?.title ?? ""} placeholder="İlk siparişinize %10 indirim" />
      </div>
      <div className="field">
        <label htmlFor="p-body">Metin</label>
        <textarea className="input" id="p-body" name="body" rows={3} defaultValue={p?.body ?? ""} placeholder="Bültenimize katılın, kampanyalardan ilk siz haberdar olun." />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-img">Görsel URL (isteğe bağlı)</label>
          <input className="input" id="p-img" name="image_url" defaultValue={p?.image_url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="p-coupon">Kupon kodu</label>
          <input className="input" id="p-coupon" name="coupon_code" defaultValue={p?.coupon_code ?? ""} placeholder="HOSGELDIN10" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-cta">Buton metni</label>
          <input className="input" id="p-cta" name="cta_text" defaultValue={p?.cta_text ?? ""} placeholder="Abone ol" />
        </div>
        <div className="field">
          <label htmlFor="p-url">Buton bağlantısı (duyuru için)</label>
          <input className="input" id="p-url" name="cta_url" defaultValue={p?.cta_url ?? ""} placeholder="/kampanyalar" />
        </div>
      </div>
      <h3 className="subhead">Ne zaman gösterilsin?</h3>
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-trigger">Tetikleyici</label>
          <select className="select" id="p-trigger" name="trigger_type" defaultValue={p?.trigger_type ?? "delay"}>
            <option value="delay">Belirli saniye sonra</option>
            <option value="exit">Sayfadan çıkarken (masaüstü)</option>
            <option value="scroll">Sayfa kaydırılınca</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-delay">Gecikme (sn)</label>
          <input className="input" id="p-delay" name="delay_sec" type="number" min={0} max={300} defaultValue={p?.delay_sec ?? 8} />
        </div>
        <div className="field">
          <label htmlFor="p-scroll">Kaydırma (%)</label>
          <input className="input" id="p-scroll" name="scroll_pct" type="number" min={5} max={100} defaultValue={p?.scroll_pct ?? 50} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-pages">Sayfalar</label>
          <select className="select" id="p-pages" name="pages" defaultValue={p?.pages ?? "all"}>
            <option value="all">Tüm sayfalar</option>
            <option value="home">Yalnızca ana sayfa</option>
            <option value="product">Ürün sayfaları</option>
            <option value="category">Kategori / arama</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-device">Cihaz</label>
          <select className="select" id="p-device" name="device" defaultValue={p?.device ?? "all"}>
            <option value="all">Tümü</option>
            <option value="mobile">Mobil</option>
            <option value="desktop">Masaüstü</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-freq">Tekrar gösterim (gün)</label>
          <input className="input" id="p-freq" name="frequency_days" type="number" min={0} max={365} defaultValue={p?.frequency_days ?? 7} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-start">Başlangıç</label>
          <input className="input" id="p-start" name="starts_at" type="date" defaultValue={dateInput(p?.starts_at ?? null)} />
        </div>
        <div className="field">
          <label htmlFor="p-end">Bitiş</label>
          <input className="input" id="p-end" name="ends_at" type="date" defaultValue={dateInput(p?.ends_at ?? null)} />
        </div>
      </div>
      <Toggle name="is_active" defaultChecked={p ? Boolean(p.is_active) : false} label="Yayında" hint="Aynı anda sitede tek popup gösterilir: siteye özel olan, yoksa en son güncellenen." />
      <div className="form-actions">
        <Link className="btn btn-ghost" href="/marketing/popups">
          Vazgeç
        </Link>
        <button className="btn btn-primary" type="submit">
          {p ? "Kaydet" : "Popup oluştur"}
        </button>
      </div>
    </form>
  );
}

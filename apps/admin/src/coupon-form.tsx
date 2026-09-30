import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, tenants, type CouponRow } from "@guntan/db";
import { withBase } from "./paths";
import { formatTry } from "./ui";
import { Toggle } from "./ui-ext";

function dateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export async function CouponForm({ coupon }: { coupon?: CouponRow }) {
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const c = coupon;
  return (
    <form action={withBase(c ? `/api/coupons/${c.id}` : "/api/coupons")} method="post" className="form-stack">
      <input type="hidden" name="_action" value="save" />
      <div className="form-row">
        <div className="field">
          <label htmlFor="k-code">Kupon kodu</label>
          <input className="input mono" id="k-code" name="code" required defaultValue={c?.code ?? ""} placeholder="HOSGELDIN10" style={{ textTransform: "uppercase" }} />
        </div>
        <div className="field">
          <label htmlFor="k-tenant">Site</label>
          <select className="input" id="k-tenant" name="tenantId" defaultValue={c?.tenant_id ?? "all"} disabled={Boolean(c)}>
            {!c ? <option value="all">Tüm siteler (her siteye ayrı kupon)</option> : null}
            {tenantRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>İndirim türü</label>
        <div className="choice-grid is-3">
          {[
            { v: "percent", l: "Yüzde (%)", h: "Sepet tutarından yüzde indirim" },
            { v: "fixed", l: "Sabit tutar (TL)", h: "Sepetten sabit TL düşülür" },
            { v: "free_shipping", l: "Ücretsiz kargo", h: "Kargo ücreti alınmaz" },
          ].map((o) => (
            <label key={o.v} className="choice">
              <input type="radio" name="type" value={o.v} defaultChecked={(c?.type ?? "percent") === o.v} />
              <span>
                <strong>{o.l}</strong>
                <small>{o.h}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="k-value">İndirim değeri</label>
          <input className="input" id="k-value" name="value" inputMode="decimal" defaultValue={c ? String(Number(c.value)).replace(".", ",") : "10"} />
          <small className="field-hint">Yüzde için 10 = %10. Ücretsiz kargoda dikkate alınmaz.</small>
        </div>
        <div className="field">
          <label htmlFor="k-min">En az sepet tutarı (TL)</label>
          <input className="input" id="k-min" name="minSubtotal" inputMode="decimal" defaultValue={c?.min_subtotal ? String(Number(c.min_subtotal)).replace(".", ",") : ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="k-start">Başlangıç</label>
          <input className="input" id="k-start" name="startsAt" type="date" defaultValue={dateInput(c?.starts_at ?? null)} />
        </div>
        <div className="field">
          <label htmlFor="k-end">Bitiş</label>
          <input className="input" id="k-end" name="endsAt" type="date" defaultValue={dateInput(c?.ends_at ?? null)} />
        </div>
        <div className="field">
          <label htmlFor="k-limit">Toplam kullanım limiti</label>
          <input className="input" id="k-limit" name="usageLimit" type="number" min={1} defaultValue={c?.usage_limit ?? ""} placeholder="Sınırsız" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="k-desc">İç açıklama</label>
        <input className="input" id="k-desc" name="description" defaultValue={c?.description ?? ""} placeholder="Örn. Instagram kampanyası" />
      </div>
      <Toggle name="isActive" defaultChecked={c ? Boolean(Number(c.is_active)) : true} label="Aktif" />
      <div className="form-actions">
        <Link className="btn btn-ghost" href="/marketing/coupons">
          Vazgeç
        </Link>
        <button className="btn btn-primary" type="submit">
          {c ? "Kaydet" : "Kupon oluştur"}
        </button>
      </div>
    </form>
  );
}

export function couponValueText(type: string, value: string | number) {
  if (type === "free_shipping") return "Ücretsiz kargo";
  if (type === "fixed") return `${formatTry(value)} indirim`;
  return `%${Number(value).toLocaleString("tr-TR")} indirim`;
}

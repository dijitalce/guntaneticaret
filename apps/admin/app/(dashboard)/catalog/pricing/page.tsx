import { ne, sql } from "drizzle-orm";
import { db, products } from "@guntan/db";
import {
  getRepriceJob,
  isRepriceRunning,
  loadAppliedPriceTiers,
  loadPriceTiers,
  sameTiers,
  toStoredTiers,
  type PriceTier,
} from "@guntan/import";
import { PRODUCT_SOURCE } from "@guntan/types";
import { AutoRefresh } from "@/src/auto-refresh";
import { withBase } from "@/src/paths";
import { PriceTierEditor } from "@/src/price-tier-editor";
import { Alert, PageHeader, Panel, formatDate } from "@/src/ui";

export const metadata = { title: "Fiyat oranları" };
export const dynamic = "force-dynamic";

async function countByTier(tiers: PriceTier[]): Promise<number[]> {
  const cases = sql.join(
    tiers.slice(0, -1).map((t, i) => sql`when ${products.price} <= ${(t.below * (1 + t.percent / 100)).toFixed(2)} then ${i}`),
    sql` `,
  );
  const bucket = tiers.length > 1 ? sql`case ${cases} else ${tiers.length - 1} end` : sql`0`;
  const rows = await db
    .select({ bucket: sql<number>`${bucket}`, n: sql<number>`count(*)` })
    .from(products)
    .where(ne(products.source, PRODUCT_SOURCE.MANUAL))
    .groupBy(sql`1`);
  const out = tiers.map(() => 0);
  for (const r of rows) out[Number(r.bucket)] = Number(r.n);
  return out;
}

const OK_MESSAGES: Record<string, string> = {
  kaydedildi: "Oranlar kaydedildi. Satış fiyatları bir sonraki tedarikçi senkronunda yeni oranlarla hesaplanacak.",
  basladi: "Oranlar kaydedildi, fiyat güncellemesi başladı. İlerlemeyi aşağıda izleyebilirsiniz.",
  guncel: "Oranlar kaydedildi. Fiyatlar zaten bu oranlara göre, güncellenecek ürün yok.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const [setting, applied, job] = await Promise.all([loadPriceTiers(), loadAppliedPriceTiers(), getRepriceJob()]);
  const counts = await countByTier(applied ?? setting.tiers);
  const running = isRepriceRunning(job);
  const pending = !running && applied != null && !sameTiers(applied, setting.tiers);
  const stored = toStoredTiers(setting.tiers);
  const pct = job && job.total ? Math.min(100, Math.round((job.scanned / job.total) * 100)) : 0;

  return (
    <>
      {running || (sp.ok === "basladi" && job?.status !== "done" && job?.status !== "failed") ? <AutoRefresh /> : null}
      <PageHeader
        title="Fiyat oranları"
        description="Tedarikçi maliyetine uygulanan kademeli kâr marjları. Oranı maliyetin düştüğü dilim belirler."
        crumbs={[{ href: "/catalog/products", label: "Ürünler" }]}
      />

      {sp.ok && OK_MESSAGES[sp.ok] ? <Alert tone="ok">{OK_MESSAGES[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      {running && job ? (
        <Alert tone="info">
          <strong>Fiyatlar güncelleniyor…</strong> {job.scanned.toLocaleString("tr-TR")} / {job.total.toLocaleString("tr-TR")} ürün tarandı,{" "}
          {job.updated.toLocaleString("tr-TR")} fiyat değişti.
          <div className="sync-progress is-running" style={{ marginTop: "0.5rem" }}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </Alert>
      ) : job?.status === "done" && sp.ok === "basladi" ? (
        <Alert tone="ok">
          Fiyat güncellemesi tamamlandı: {job.updated.toLocaleString("tr-TR")} ürünün fiyatı değişti.
        </Alert>
      ) : job?.status === "failed" ? (
        <Alert>Son fiyat güncellemesi yarıda kaldı: {job.error}. Tekrar “Kaydet ve fiyatları şimdi güncelle” deyin.</Alert>
      ) : null}

      {pending ? (
        <Alert tone="warn">
          Kaydedilen oranlar henüz fiyatlara yansımadı. Bir sonraki senkronu bekleyebilir ya da “Kaydet ve fiyatları şimdi güncelle” ile hemen
          uygulayabilirsiniz.
        </Alert>
      ) : null}

      <div className="grid-2">
        <div>
          <Panel
            title="Marj dilimleri"
            description={
              setting.isDefault
                ? "Varsayılan oranlar kullanılıyor."
                : `Son değişiklik ${setting.updatedAt ? formatDate(setting.updatedAt) : ""}${setting.updatedBy ? ` · ${setting.updatedBy}` : ""}`
            }
          >
            <PriceTierEditor action={withBase("/api/pricing")} initial={stored} saved={stored} counts={counts} disabled={running} />
          </Panel>
        </div>
        <div>
          <Panel title="Nasıl çalışır?" padded>
            <dl className="dl">
              <div>
                <dt>Hesaplama</dt>
                <dd>Satış = maliyet × (1 + marj). Örn. 800 TL maliyet, %30 marj → 1.040 TL.</dd>
              </div>
              <div>
                <dt>Kaydet</dt>
                <dd>Yeni oranlar bir sonraki otomatik senkronda (günde 2 kez) tedarikçi maliyetinden hesaplanır.</dd>
              </div>
              <div>
                <dt>Şimdi güncelle</dt>
                <dd>
                  Mevcut fiyatlar birkaç dakika içinde yeni oranlara taşınır. Dilim sınırındaki birkaç üründe kuruş farkı olabilir; senkron kesin
                  maliyetten düzeltir.
                </dd>
              </div>
              <div>
                <dt>Kapsam</dt>
                <dd>Yalnızca tedarikçi (XML/API) ürünleri. Elle eklenen ürünlerin fiyatı değişmez.</dd>
              </div>
              <div>
                <dt>Ürün sütunu</dt>
                <dd>Mevcut satış fiyatına göre her dilimdeki yaklaşık ürün sayısı.</dd>
              </div>
            </dl>
          </Panel>
          {job?.finishedAt ? (
            <Panel title="Son toplu güncelleme" padded>
              <dl className="dl-rows">
                <div>
                  <dt>Tarih</dt>
                  <dd>{formatDate(job.finishedAt)}</dd>
                </div>
                <div>
                  <dt>Değişen fiyat</dt>
                  <dd>{job.updated.toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>Durum</dt>
                  <dd>{job.status === "done" ? "Tamamlandı" : "Yarıda kaldı"}</dd>
                </div>
                {job.by ? (
                  <div>
                    <dt>Yapan</dt>
                    <dd>{job.by}</dd>
                  </div>
                ) : null}
              </dl>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

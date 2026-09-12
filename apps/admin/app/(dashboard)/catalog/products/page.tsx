import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, productOems, products } from "@guntan/db";
import { withBase } from "@/src/paths";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/src/ui";

export const metadata = { title: "Ürünler" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";

  const conditions = [];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(products.sku, pattern),
        like(products.name, pattern),
        like(products.barcode, pattern),
        sql`exists (
          select 1 from product_oems po
          where po.product_id = ${products.id}
            and po.raw like ${pattern}
        )`,
      )!,
    );
  }
  if (status) conditions.push(eq(products.status, status));

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.updatedAt))
    .limit(50);

  const ids = rows.map((r) => r.id);
  const oemRows = ids.length
    ? await db
        .select({ productId: productOems.productId, raw: productOems.raw })
        .from(productOems)
        .where(inArray(productOems.productId, ids))
    : [];
  const oemBy = new Map<string, string[]>();
  for (const oem of oemRows) {
    const list = oemBy.get(oem.productId) ?? [];
    if (list.length < 4) list.push(oem.raw);
    oemBy.set(oem.productId, list);
  }

  const nextQuery = new URLSearchParams();
  if (q) nextQuery.set("q", q);
  if (status) nextQuery.set("status", status);
  const nextPath = `/catalog/products${nextQuery.toString() ? `?${nextQuery}` : ""}`;

  return (
    <>
      <PageHeader
        title="Ürünler"
        description="SKU / OEM / ad / barkod ile ara; fiyat, stok ve yayın durumunu hızlı güncelle. Kaynak XML olan ürünlerde değişiklikler bir sonraki sync’te ezilebilir."
      />

      {sp.ok === "1" && (
        <p className="login-alert" style={{ background: "#e8f7ef", color: "#0f7a45" }} role="status">
          Ürün güncellendi.
        </p>
      )}
      {sp.hata === "1" && (
        <p className="login-alert" role="alert">
          Güncelleme başarısız. Değerleri kontrol edin.
        </p>
      )}

      <Panel>
        <form className="toolbar" method="get">
          <div className="field" style={{ minWidth: 240, flex: 1 }}>
            <label htmlFor="q">Ara</label>
            <input className="input" id="q" name="q" defaultValue={q} placeholder="SKU, OEM, ürün adı veya barkod" />
          </div>
          <div className="field">
            <label htmlFor="status">Durum</label>
            <select id="status" className="select" name="status" defaultValue={status}>
              <option value="">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="draft">Taslak</option>
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">
            Filtrele
          </button>
        </form>

        {rows.length === 0 ? (
          <EmptyState title="Ürün yok" description="Aramayı değiştirin veya XML import çalıştırın." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Fiyat</th>
                  <th>Stok</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                        SKU <code>{p.sku}</code>
                        {oemBy.get(p.id)?.length ? ` · OEM ${oemBy.get(p.id)!.join(", ")}` : ""}
                        {p.source ? ` · ${p.source}` : ""}
                        {" · "}
                        <StatusBadge tone={p.stockStatus === "out_of_stock" ? "bad" : "ok"}>
                          {p.stockStatus}
                        </StatusBadge>
                      </div>
                    </td>
                    <td colSpan={4} style={{ paddingTop: "0.55rem", paddingBottom: "0.55rem" }}>
                      <form
                        action={withBase(`/api/products/${p.id}`)}
                        method="post"
                        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.45rem", alignItems: "end" }}
                      >
                        <input type="hidden" name="next" value={nextPath} />
                        <div className="field">
                          <label>Fiyat (TL)</label>
                          <input className="input" name="price" type="number" step="0.01" min="0" defaultValue={p.price} required />
                        </div>
                        <div className="field">
                          <label>Stok</label>
                          <input className="input" name="stockQty" type="number" min="0" defaultValue={p.stockQty} required />
                        </div>
                        <div className="field">
                          <label>Yayın</label>
                          <select className="select" name="status" defaultValue={p.status}>
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                            <option value="draft">Taslak</option>
                          </select>
                        </div>
                        <button className="btn btn-primary" type="submit">
                          Kaydet
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="panel-pad" style={{ color: "#6b7280", fontSize: "0.85rem" }}>
          Gösterilen: {rows.length} (en fazla 50). Toplam katalog için arama kullanın.
        </div>
      </Panel>
    </>
  );
}

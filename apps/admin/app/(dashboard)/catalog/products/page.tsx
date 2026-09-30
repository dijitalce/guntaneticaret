import Link from "next/link";
import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db, productImages, productOems, products } from "@guntan/db";
import { IconBox, IconSearch } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, Panel, formatDate } from "@/src/ui";

export const metadata = { title: "Ürünler" };

const PAGE_SIZE = 50;
const TABS = [
  { key: "", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Pasif" },
  { key: "draft", label: "Taslak" },
  { key: "stoksuz", label: "Stoksuz" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; hata?: string; sayfa?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const search: SQL[] = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    search.push(
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
  const conditions = [...search];
  if (status === "stoksuz") conditions.push(eq(products.stockStatus, "out_of_stock"));
  else if (status) conditions.push(eq(products.status, status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(products).where(where),
  ]);
  const total = totalRows[0]?.total ?? 0;

  const ids = rows.map((r) => r.id);
  const [oemRows, imageRows] = ids.length
    ? await Promise.all([
        db
          .select({ productId: productOems.productId, raw: productOems.raw })
          .from(productOems)
          .where(inArray(productOems.productId, ids)),
        db
          .select({ productId: productImages.productId, url: productImages.url })
          .from(productImages)
          .where(inArray(productImages.productId, ids))
          .orderBy(asc(productImages.sortOrder)),
      ])
    : [[], []];
  const oemBy = new Map<string, string[]>();
  for (const oem of oemRows) {
    const list = oemBy.get(oem.productId) ?? [];
    if (list.length < 3) list.push(oem.raw);
    oemBy.set(oem.productId, list);
  }
  const imageBy = new Map<string, string>();
  for (const img of imageRows) if (!imageBy.has(img.productId)) imageBy.set(img.productId, img.url);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: q || undefined, status: status || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/catalog/products?${s}` : "/catalog/products";
  };
  const nextPath = href({ sayfa: page > 1 ? String(page) : undefined });

  return (
    <>
      <PageHeader
        title="Ürünler"
        description="Fiyat, stok ve yayın durumunu satırdan hızlıca güncelleyin. XML kaynaklı ürünlerde değişiklikler bir sonraki senkronda ezilebilir."
      />

      {sp.ok === "1" && <Alert tone="ok">Ürün güncellendi.</Alert>}
      {sp.hata === "1" && <Alert>Güncelleme başarısız. Değerleri kontrol edin.</Alert>}

      <Panel>
        <nav className="tabs" aria-label="Ürün durumu">
          {TABS.map((t) => (
            <Link key={t.key || "all"} href={href({ status: t.key || undefined, sayfa: undefined })} className={status === t.key ? "is-active" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>

        <form className="toolbar" method="get">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={q} placeholder="SKU, OEM, ürün adı veya barkod" aria-label="Ürün ara" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Ara
          </button>
          {q ? (
            <Link className="btn btn-ghost" href={href({ q: undefined, sayfa: undefined })}>
              Temizle
            </Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title="Ürün bulunamadı"
            description={q ? `“${q}” için eşleşen ürün yok.` : "Bu filtrede ürün yok."}
            icon={IconBox}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th style={{ width: 420 }}>Fiyat · Stok · Yayın</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const img = imageBy.get(p.id);
                  const oos = p.stockStatus === "out_of_stock";
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="item-row">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="item-thumb" src={img} alt="" loading="lazy" />
                          ) : (
                            <span className="item-thumb" style={{ display: "grid", placeItems: "center", color: "var(--a-muted)" }}>
                              <IconBox width={18} height={18} />
                            </span>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <span className="sub">
                              <code>{p.sku}</code>
                              {oemBy.get(p.id)?.length ? ` · OEM ${oemBy.get(p.id)!.join(", ")}` : ""}
                              {` · ${p.source === "manual" ? "Elle" : p.source}`}
                              {` · ${formatDate(p.updatedAt, false)}`}
                            </span>
                            {oos ? (
                              <span className="badge badge-bad" style={{ marginTop: "0.3rem" }}>
                                Stokta yok
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <form action={withBase(`/api/products/${p.id}`)} method="post" className="inline-edit">
                          <input type="hidden" name="next" value={nextPath} />
                          <label>
                            <span>Fiyat ₺</span>
                            <input className="input" name="price" type="number" step="0.01" min="0" defaultValue={p.price} required />
                          </label>
                          <label>
                            <span>Stok</span>
                            <input className="input" name="stockQty" type="number" min="0" defaultValue={p.stockQty} required />
                          </label>
                          <label>
                            <span>Yayın</span>
                            <select className="select" name="status" defaultValue={p.status}>
                              <option value="active">Aktif</option>
                              <option value="inactive">Pasif</option>
                              <option value="draft">Taslak</option>
                            </select>
                          </label>
                          <button className="btn btn-primary btn-sm" type="submit">
                            Kaydet
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="toolbar" style={{ justifyContent: "space-between", borderTop: "1px solid var(--a-border)", borderBottom: 0 }}>
          <span className="muted text-sm">
            {total.toLocaleString("tr-TR")} ürün{pages > 1 ? ` · Sayfa ${page}/${pages}` : ""}
          </span>
          {pages > 1 ? (
            <div className="row-actions">
              {page > 1 ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page - 1) })}>
                  Önceki
                </Link>
              ) : null}
              {page < pages ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page + 1) })}>
                  Sonraki
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

import Link from "next/link";
import { and, asc, count, desc, eq, gt, inArray, like, lte, or, sql, type SQL } from "drizzle-orm";
import { db, manufacturers, productImages, productOems, products, suppliers } from "@guntan/db";
import { IconBox, IconSearch, IconWallet } from "@/src/icons";
import { ProductDataTable, type ProductRow, type SortHeader } from "@/src/product-data-table";
import { Alert, EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Ürünler" };
export const dynamic = "force-dynamic";

const PAGE_SIZES = [25, 50, 100, 200];
const TABS = [
  { key: "", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Pasif" },
  { key: "draft", label: "Taslak" },
  { key: "stoksuz", label: "Stoksuz" },
];
const SORTS = {
  name: products.name,
  price: products.price,
  stock: products.stockQty,
  updated: products.updatedAt,
} as const;
type SortKey = keyof typeof SORTS;

type Params = {
  q?: string;
  status?: string;
  tedarikci?: string;
  gorsel?: string;
  stok?: string;
  sirala?: string;
  yon?: string;
  adet?: string;
  sayfa?: string;
  ok?: string;
  hata?: string;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const supplierId = sp.tedarikci ?? "";
  const image = sp.gorsel === "var" || sp.gorsel === "yok" ? sp.gorsel : "";
  const stock = sp.stok === "var" || sp.stok === "az" ? sp.stok : "";
  const sortKey: SortKey = sp.sirala && sp.sirala in SORTS ? (sp.sirala as SortKey) : "updated";
  const dir = sp.yon === "asc" ? "asc" : sp.yon === "desc" ? "desc" : sortKey === "name" ? "asc" : "desc";
  const pageSize = PAGE_SIZES.includes(Number(sp.adet)) ? Number(sp.adet) : 50;
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const conditions: SQL[] = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(
        like(products.sku, pattern),
        like(products.name, pattern),
        like(products.barcode, pattern),
        sql`exists (select 1 from product_oems po where po.product_id = ${products.id} and po.raw like ${pattern})`,
      )!,
    );
  }
  if (status === "stoksuz") conditions.push(eq(products.stockStatus, "out_of_stock"));
  else if (status) conditions.push(eq(products.status, status));
  if (supplierId) conditions.push(eq(products.supplierId, supplierId));
  if (image === "var") conditions.push(sql`exists (select 1 from product_images pi where pi.product_id = ${products.id})`);
  if (image === "yok") conditions.push(sql`not exists (select 1 from product_images pi where pi.product_id = ${products.id})`);
  if (stock === "var") conditions.push(gt(products.stockQty, 0));
  if (stock === "az") conditions.push(and(gt(products.stockQty, 0), lte(products.stockQty, 5))!);
  const where = conditions.length ? and(...conditions) : undefined;
  const sortCol = SORTS[sortKey];

  const [rows, totalRows, supplierRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        slug: products.slug,
        price: products.price,
        stockQty: products.stockQty,
        status: products.status,
        stockStatus: products.stockStatus,
        updatedAt: products.updatedAt,
        manufacturer: manufacturers.name,
        supplier: suppliers.name,
      })
      .from(products)
      .leftJoin(manufacturers, eq(manufacturers.id, products.manufacturerId))
      .leftJoin(suppliers, eq(suppliers.id, products.supplierId))
      .where(where)
      .orderBy(dir === "asc" ? asc(sortCol) : desc(sortCol), asc(products.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(products).where(where),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).orderBy(asc(suppliers.name)),
  ]);
  const total = totalRows[0]?.total ?? 0;

  const ids = rows.map((r) => r.id);
  const [oemRows, imageRows] = ids.length
    ? await Promise.all([
        db.select({ productId: productOems.productId, raw: productOems.raw }).from(productOems).where(inArray(productOems.productId, ids)),
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

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current: Record<string, string | undefined> = {
    q: q || undefined,
    status: status || undefined,
    tedarikci: supplierId || undefined,
    gorsel: image || undefined,
    stok: stock || undefined,
    sirala: sortKey === "updated" ? undefined : sortKey,
    yon: sp.yon,
    adet: pageSize === 50 ? undefined : String(pageSize),
  };
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/catalog/products?${s}` : "/catalog/products";
  };
  const sortHeader = (key: SortKey, label: string, extra: Partial<SortHeader> = {}): SortHeader => {
    const active = sortKey === key;
    const nextDir = active ? (dir === "asc" ? "desc" : "asc") : key === "name" ? "asc" : "desc";
    return { key, label, href: href({ sirala: key === "updated" ? undefined : key, yon: nextDir, sayfa: undefined }), dir: active ? dir : null, ...extra };
  };
  const headers: SortHeader[] = [
    sortHeader("name", "Ürün"),
    { key: "brand", label: "Marka · Tedarikçi" },
    sortHeader("price", "Fiyat", { num: true, width: 130 }),
    sortHeader("stock", "Stok", { num: true, width: 110 }),
    { key: "status", label: "Yayın", width: 120 },
    sortHeader("updated", "Güncelleme", { width: 130 }),
  ];
  const tableRows: ProductRow[] = rows.map((r) => ({
    ...r,
    updatedAt: new Date(r.updatedAt).toISOString(),
    image: imageBy.get(r.id) ?? null,
    oems: oemBy.get(r.id) ?? [],
  }));
  const storefrontUrl = (process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com").replace(/\/$/, "");
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const hasFilter = Boolean(q || supplierId || image || stock);

  const pageLinks: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) pageLinks.push(i);

  return (
    <>
      <PageHeader
        title="Ürünler"
        description="Fiyat, stok ve yayın durumunu tablodan doğrudan değiştirin; değişiklik anında kaydedilir. XML kaynaklı ürünlerde değişiklikler bir sonraki senkronda ezilebilir."
        actions={
          <Link className="btn btn-secondary" href="/catalog/pricing">
            <IconWallet />
            Fiyat oranları
          </Link>
        }
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

        <form className="toolbar dt-toolbar" method="get">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {current.sirala ? <input type="hidden" name="sirala" value={current.sirala} /> : null}
          {sp.yon ? <input type="hidden" name="yon" value={sp.yon} /> : null}
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={q} placeholder="SKU, OEM, ürün adı veya barkod" aria-label="Ürün ara" />
          </div>
          <select className="select" name="tedarikci" defaultValue={supplierId} aria-label="Tedarikçi">
            <option value="">Tüm tedarikçiler</option>
            {supplierRows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="select" name="stok" defaultValue={stock} aria-label="Stok">
            <option value="">Tüm stoklar</option>
            <option value="var">Stokta olanlar</option>
            <option value="az">Az stoklu (1-5)</option>
          </select>
          <select className="select" name="gorsel" defaultValue={image} aria-label="Görsel">
            <option value="">Görsel: hepsi</option>
            <option value="var">Görseli olanlar</option>
            <option value="yok">Görseli olmayanlar</option>
          </select>
          <select className="select" name="adet" defaultValue={String(pageSize)} aria-label="Sayfa başına">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / sayfa
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            Filtrele
          </button>
          {hasFilter ? (
            <Link className="btn btn-ghost" href={href({ q: undefined, tedarikci: undefined, gorsel: undefined, stok: undefined, sayfa: undefined })}>
              Temizle
            </Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <EmptyState title="Ürün bulunamadı" description={q ? `“${q}” için eşleşen ürün yok.` : "Bu filtrede ürün yok."} icon={IconBox} />
        ) : (
          <ProductDataTable rows={tableRows} headers={headers} storefrontUrl={storefrontUrl} />
        )}

        <div className="toolbar dt-footer">
          <span className="muted text-sm">
            {total ? `${from.toLocaleString("tr-TR")}–${to.toLocaleString("tr-TR")} / ${total.toLocaleString("tr-TR")} ürün` : "0 ürün"}
          </span>
          {pages > 1 ? (
            <nav className="dt-pager" aria-label="Sayfalar">
              {page > 1 ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page - 1) })}>
                  ‹ Önceki
                </Link>
              ) : null}
              {pageLinks[0]! > 1 ? (
                <>
                  <Link className="btn btn-ghost btn-sm" href={href({ sayfa: undefined })}>
                    1
                  </Link>
                  {pageLinks[0]! > 2 ? <span className="muted">…</span> : null}
                </>
              ) : null}
              {pageLinks.map((n) => (
                <Link key={n} className={`btn btn-sm ${n === page ? "btn-primary" : "btn-ghost"}`} href={href({ sayfa: n > 1 ? String(n) : undefined })}>
                  {n.toLocaleString("tr-TR")}
                </Link>
              ))}
              {pageLinks[pageLinks.length - 1]! < pages ? (
                <>
                  {pageLinks[pageLinks.length - 1]! < pages - 1 ? <span className="muted">…</span> : null}
                  <Link className="btn btn-ghost btn-sm" href={href({ sayfa: String(pages) })}>
                    {pages.toLocaleString("tr-TR")}
                  </Link>
                </>
              ) : null}
              {page < pages ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page + 1) })}>
                  Sonraki ›
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

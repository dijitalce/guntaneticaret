import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, getBlogCategory, listBlogCategories, tenants } from "@guntan/db";
import { ConfirmButton } from "@/src/form-fields";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Blog kategorileri" };
export const dynamic = "force-dynamic";

export default async function BlogCategoriesAdmin({ searchParams }: { searchParams: Promise<{ duzenle?: string; ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const [tenantRows, cats, editing] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name)),
    listBlogCategories(),
    sp.duzenle ? getBlogCategory(sp.duzenle) : Promise.resolve(null),
  ]);
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader
        title="Blog kategorileri"
        description="Her kategori /blog/kategori/adres sayfasında yayınlanır. Açıklama ve meta alanları kategori sayfasının SEO'sunu belirler."
        crumbs={[{ label: "Blog", href: "/content/blog" }]}
      />
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Kategori kaydedildi.</Alert> : null}
      {sp.ok === "silindi" ? <Alert tone="ok">Kategori silindi; yazıları kategorisiz kaldı.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="grid-halves">
        <Panel>
          {cats.length === 0 ? (
            <EmptyState title="Kategori yok" description="Örn. Bakım rehberi, Arıza belirtileri, Parça seçimi." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kategori</th>
                    {tenantRows.length > 1 ? <th>Site</th> : null}
                    <th>Yazı</th>
                    <th aria-label="İşlemler" />
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <div className="muted text-sm">/blog/kategori/{c.slug}</div>
                      </td>
                      {tenantRows.length > 1 ? <td className="text-sm">{tenantName.get(c.tenantId) ?? "—"}</td> : null}
                      <td>{c.postCount}</td>
                      <td className="table-actions">
                        <Link className="btn btn-secondary btn-sm" href={`/content/blog/categories?duzenle=${c.id}`}>
                          Düzenle
                        </Link>
                        <form action={withBase("/api/content/blog/categories")} method="post" style={{ display: "inline" }}>
                          <input type="hidden" name="_action" value="delete" />
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmButton className="btn btn-ghost btn-sm" message={`“${c.name}” kategorisi silinsin mi? Yazılar silinmez.`}>
                            Sil
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={editing ? `Düzenle: ${editing.name}` : "Yeni kategori"} padded>
          <form key={editing?.id ?? "new"} action={withBase("/api/content/blog/categories")} method="post" className="form-stack">
            <input type="hidden" name="_action" value="save" />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="field">
              <label htmlFor="bc-tenant">Site</label>
              <select className="select" id="bc-tenant" name="tenantId" defaultValue={editing?.tenantId ?? tenantRows[0]?.id} required>
                {tenantRows.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="bc-name">Ad</label>
                <input className="input" id="bc-name" name="name" required maxLength={191} defaultValue={editing?.name ?? ""} placeholder="Bakım rehberi" />
              </div>
              <div className="field">
                <label htmlFor="bc-slug">Adres</label>
                <input className="input mono" id="bc-slug" name="slug" defaultValue={editing?.slug ?? ""} placeholder="otomatik" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="bc-desc">Açıklama</label>
              <textarea className="input" id="bc-desc" name="description" rows={4} defaultValue={editing?.description ?? ""} placeholder="Kategori sayfasının üstünde görünür; 1–3 cümlelik özgün bir giriş yazın." />
            </div>
            <div className="field">
              <label htmlFor="bc-mt">Meta başlık</label>
              <input className="input" id="bc-mt" name="metaTitle" maxLength={255} defaultValue={editing?.metaTitle ?? ""} placeholder="Boşsa kategori adı" />
            </div>
            <div className="field">
              <label htmlFor="bc-md">Meta açıklama</label>
              <textarea className="input" id="bc-md" name="metaDescription" rows={2} maxLength={500} defaultValue={editing?.metaDescription ?? ""} />
            </div>
            <div className="field" style={{ maxWidth: 140 }}>
              <label htmlFor="bc-sort">Sıra</label>
              <input className="input" id="bc-sort" name="sortOrder" type="number" min={0} max={999} defaultValue={editing?.sortOrder ?? 0} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                {editing ? "Kaydet" : "Kategori ekle"}
              </button>
              {editing ? (
                <Link className="btn btn-ghost" href="/content/blog/categories">
                  Vazgeç
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}

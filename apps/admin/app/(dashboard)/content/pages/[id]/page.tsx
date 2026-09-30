import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, getTenantContext, pages } from "@guntan/db";
import { PageForm } from "@/src/content-forms";
import { ConfirmButton } from "@/src/form-fields";
import { IconExternal, IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge } from "@/src/ui";

export const metadata = { title: "Sayfa düzenle" };
export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!page) notFound();
  const tenant = await getTenantContext(page.tenantId);
  const url = `${tenant.url}/sayfa/${page.slug}`;

  return (
    <div className="form-page is-wide">
      <PageHeader
        title={page.title}
        description={`${tenant.name} · /sayfa/${page.slug}`}
        crumbs={[{ label: "Sayfalar", href: "/content/pages" }]}
        actions={
          <>
            <StatusBadge tone={page.isPublished ? "ok" : "neutral"}>{page.isPublished ? "Yayında" : "Taslak"}</StatusBadge>
            {page.isPublished ? (
              <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">
                <IconExternal />
                Sitede gör
              </a>
            ) : null}
          </>
        }
      />
      {sp.ok === "olusturuldu" ? <Alert tone="ok">Sayfa oluşturuldu.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Değişiklikler kaydedildi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <PageForm page={page} />
      </Panel>
      <Panel title="Sayfayı sil" description="Silinen sayfa geri alınamaz; menülerdeki bağlantıları da güncellemeyi unutmayın." padded>
        <form action={withBase(`/api/content/pages/${page.id}`)} method="post">
          <input type="hidden" name="_action" value="delete" />
          <ConfirmButton className="btn btn-danger" message={`“${page.title}” sayfası silinsin mi?`}>
            <IconTrash />
            Sayfayı sil
          </ConfirmButton>
        </form>
      </Panel>
    </div>
  );
}

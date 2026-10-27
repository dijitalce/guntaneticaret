import { notFound } from "next/navigation";
import { getBlogPost, getTenantContext } from "@guntan/db";
import { BlogPostForm } from "@/src/blog-form";
import { ConfirmButton } from "@/src/form-fields";
import { IconExternal, IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";

export const metadata = { title: "Blog yazısı düzenle" };
export const dynamic = "force-dynamic";

export default async function EditBlogPost({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await getBlogPost(id);
  if (!post) notFound();
  const tenant = await getTenantContext(post.tenantId);
  const url = `${tenant.url}/blog/${post.slug}`;
  const scheduled = post.status === "published" && post.publishedAt && post.publishedAt.getTime() > Date.now();
  const live = post.status === "published" && !scheduled;

  return (
    <div className="form-page" style={{ maxWidth: 1320 }}>
      <PageHeader
        title={post.title}
        description={`${tenant.name} · /blog/${post.slug} · son güncelleme ${formatDate(post.updatedAt, true)}`}
        crumbs={[{ label: "Blog", href: "/content/blog" }]}
        actions={
          <>
            <StatusBadge tone={live ? "ok" : scheduled ? "info" : "neutral"}>
              {live ? "Yayında" : scheduled ? `Zamanlandı: ${formatDate(post.publishedAt, true)}` : "Taslak"}
            </StatusBadge>
            {live ? (
              <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">
                <IconExternal />
                Sitede gör
              </a>
            ) : null}
          </>
        }
      />
      {sp.ok === "olusturuldu" ? <Alert tone="ok">Yazı oluşturuldu.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Değişiklikler kaydedildi.{live ? " Yazı sitede yayında." : ""}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <BlogPostForm post={post} tenantId={post.tenantId} />
      <Panel title="Yazıyı sil" description="Silinen yazı geri alınamaz; yayındaysa adresi 404 döner. Gerekirse SEO bölümünden yönlendirme ekleyin." padded>
        <form action={withBase(`/api/content/blog/${post.id}`)} method="post">
          <input type="hidden" name="_action" value="delete" />
          <ConfirmButton className="btn btn-danger" message={`“${post.title}” yazısı silinsin mi?`}>
            <IconTrash />
            Yazıyı sil
          </ConfirmButton>
        </form>
      </Panel>
    </div>
  );
}

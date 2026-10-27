import { asc } from "drizzle-orm";
import { db, tenants } from "@guntan/db";
import { BlogPostForm } from "@/src/blog-form";
import { Alert, PageHeader } from "@/src/ui";
import { TabNav } from "@/src/ui-ext";

export const metadata = { title: "Yeni blog yazısı" };
export const dynamic = "force-dynamic";

export default async function NewBlogPost({ searchParams }: { searchParams: Promise<{ site?: string; hata?: string }> }) {
  const sp = await searchParams;
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? tenantRows[0]?.id;
  if (!tenantId) return <Alert>Önce bir site oluşturun.</Alert>;
  return (
    <>
      <PageHeader title="Yeni yazı" crumbs={[{ label: "Blog", href: "/content/blog" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {tenantRows.length > 1 ? (
        <TabNav label="Site" active={tenantId} items={tenantRows.map((t) => ({ key: t.id, label: t.name, href: `/content/blog/new?site=${t.id}` }))} />
      ) : null}
      <BlogPostForm tenantId={tenantId} />
    </>
  );
}

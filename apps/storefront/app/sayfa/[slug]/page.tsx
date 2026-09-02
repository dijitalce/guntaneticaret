import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, pages } from "@guntan/db";
import { getTenant } from "../../../src/tenant";

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenant();
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenant.tenant.id), eq(pages.slug, slug)))
    .limit(1);
  if (!page) notFound();
  return (
    <div className="container page-surface">
      <h1>{page.title}</h1>
      <div>{page.body}</div>
    </div>
  );
}

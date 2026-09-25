import type { Metadata } from "next";
import type { ReactNode } from "react";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, pages } from "@guntan/db";
import { GIZLILIK_BODY, GIZLILIK_TITLE } from "@guntan/db/content/gizlilik";
import { getTenant } from "../../../src/tenant";
import { IADE_TITLE, ReturnPolicy } from "../../../src/return-policy";

async function loadPage(slug: string) {
  const tenant = await getTenant();
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenant.tenant.id), eq(pages.slug, slug)))
    .limit(1);
  return page ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "gizlilik") return { title: GIZLILIK_TITLE };
  if (slug === "iade") return { title: IADE_TITLE };
  const page = await loadPage(slug);
  if (!page) return { title: "Sayfa bulunamadı" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "gizlilik") {
    return (
      <article className="container page-surface cms-prose">
        <h1>{GIZLILIK_TITLE}</h1>
        <CmsBody body={GIZLILIK_BODY} />
      </article>
    );
  }
  if (slug === "iade") return <ReturnPolicy />;
  const page = await loadPage(slug);
  if (!page) notFound();
  return (
    <article className="container page-surface cms-prose">
      <h1>{page.title}</h1>
      <CmsBody body={page.body} />
    </article>
  );
}

function isHeading(line: string) {
  const text = line.trim();
  if (text.length < 3 || text.length > 90) return false;
  if (/[a-zçğıöşü]/.test(text)) return false;
  return /[A-ZÇĞİÖŞÜ]/.test(text);
}

function CmsBody({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const nodes: ReactNode[] = [];
  for (const raw of blocks) {
    const text = raw.trim();
    if (!text) continue;
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 1 && isHeading(lines[0]!)) {
      nodes.push(<h2 key={nodes.length}>{lines[0]}</h2>);
      continue;
    }
    nodes.push(<p key={nodes.length}>{lines.join(" ")}</p>);
  }
  return <>{nodes}</>;
}

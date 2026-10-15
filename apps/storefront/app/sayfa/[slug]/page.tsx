import type { Metadata } from "next";
import type { ReactNode } from "react";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, pages } from "@guntan/db";
import { GIZLILIK_BODY, GIZLILIK_TITLE } from "@guntan/db/content/gizlilik";
import { getTenant } from "../../../src/tenant";
import { IADE_TITLE, ReturnPolicy } from "../../../src/return-policy";
import { DistanceSalesContract, MESAFELI_TITLE } from "../../../src/distance-sales";
import { CEREZ_TITLE, CookiePolicy } from "../../../src/cookie-policy";
import { ABOUT, AboutPage, aboutMeta, autoPartsStoreJsonLd } from "../../../src/about";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, socialProfileUrls } from "../../../src/seo";

const ABOUT_SLUG = "hakkimizda";
/** Paneldeki gövde bundan kısaysa yer tutucu sayılır ve gösterilmez. */
const ABOUT_CMS_MIN_CHARS = 200;

async function loadPage(slug: string) {
  const tenant = await getTenant();
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenant.tenant.id), eq(pages.slug, slug), eq(pages.isPublished, 1)))
    .limit(1);
  return page ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "gizlilik") return { title: GIZLILIK_TITLE };
  if (slug === "iade") return { title: IADE_TITLE };
  if (slug === "mesafeli-satis") return { title: MESAFELI_TITLE };
  if (slug === "cerez-politikasi") return { title: CEREZ_TITLE };
  if (slug === ABOUT_SLUG) {
    const [tenant, page] = await Promise.all([getTenant(), loadPage(slug)]);
    const meta = aboutMeta(tenant.siteName);
    const title = page?.metaTitle || { absolute: meta.title };
    const description = page?.metaDescription || meta.description;
    const url = absoluteUrl(tenant.tenant.canonicalHost, `/sayfa/${ABOUT_SLUG}`);
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: "website", images: [absoluteUrl(tenant.tenant.canonicalHost, ABOUT.photo.src)] },
    };
  }
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
  if (slug === "mesafeli-satis") return <DistanceSalesContract />;
  if (slug === "cerez-politikasi") return <CookiePolicy siteName={(await getTenant()).siteName} />;
  if (slug === ABOUT_SLUG) {
    const [tenant, page] = await Promise.all([getTenant(), loadPage(slug)]);
    const host = tenant.tenant.canonicalHost;
    const cmsBody = page && page.body.trim().length >= ABOUT_CMS_MIN_CHARS ? page.body : null;
    const meta = aboutMeta(tenant.siteName);
    return (
      <>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "AboutPage",
              name: meta.title,
              description: meta.description,
              url: absoluteUrl(host, `/sayfa/${ABOUT_SLUG}`),
              mainEntity: { "@id": `${absoluteUrl(host, "/")}#store` },
            },
            autoPartsStoreJsonLd(tenant, host, socialProfileUrls(tenant)),
            breadcrumbJsonLd(host, [{ name: "Ana sayfa", path: "/" }, { name: "Hakkımızda" }]),
          ]}
        />
        <AboutPage
          tenant={tenant}
          extra={cmsBody ? <div className="about-page-sections cms-prose"><CmsBody body={cmsBody} /></div> : null}
        />
      </>
    );
  }
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

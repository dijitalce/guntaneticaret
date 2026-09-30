import { PageForm } from "@/src/content-forms";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni sayfa" };
export const dynamic = "force-dynamic";

export default async function NewPage({ searchParams }: { searchParams: Promise<{ site?: string; hata?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="form-page is-wide">
      <PageHeader title="Yeni sayfa" crumbs={[{ label: "Sayfalar", href: "/content/pages" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <PageForm defaultTenant={sp.site} />
      </Panel>
    </div>
  );
}

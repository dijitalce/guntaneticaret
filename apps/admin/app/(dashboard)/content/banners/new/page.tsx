import { BannerForm } from "@/src/content-forms";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni banner" };
export const dynamic = "force-dynamic";

export default async function NewBanner({ searchParams }: { searchParams: Promise<{ site?: string; hata?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="form-page">
      <PageHeader title="Yeni banner" crumbs={[{ label: "Bannerlar", href: "/content/banners" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <BannerForm defaultTenant={sp.site} />
      </Panel>
    </div>
  );
}

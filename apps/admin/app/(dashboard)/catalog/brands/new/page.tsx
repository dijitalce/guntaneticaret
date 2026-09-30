import { Alert, PageHeader, Panel } from "@/src/ui";
import { BrandForm } from "@/src/vehicle-forms";

export const metadata = { title: "Yeni marka" };

export default async function NewBrandPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Yeni marka" crumbs={[{ href: "/catalog/brands", label: "Araç markaları" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page">
        <Panel padded>
          <BrandForm />
        </Panel>
      </div>
    </>
  );
}

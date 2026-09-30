import { PopupForm } from "@/src/popup-form";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni popup" };

export default async function NewPopupPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Yeni popup" crumbs={[{ href: "/marketing/popups", label: "Popup'lar" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page is-wide">
        <Panel padded>
          <PopupForm />
        </Panel>
      </div>
    </>
  );
}

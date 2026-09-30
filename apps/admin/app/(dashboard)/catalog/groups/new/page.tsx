import { GroupForm } from "@/src/group-form";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni marka grubu" };

export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Yeni marka grubu" crumbs={[{ href: "/catalog/groups", label: "Marka grupları" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page is-wide">
        <Panel padded>
          <GroupForm />
        </Panel>
      </div>
    </>
  );
}

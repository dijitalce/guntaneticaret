import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { banners, db } from "@guntan/db";
import { BannerForm } from "@/src/content-forms";
import { ConfirmButton } from "@/src/form-fields";
import { IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Banner düzenle" };
export const dynamic = "force-dynamic";

export default async function EditBanner({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [banner] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  if (!banner) notFound();
  return (
    <div className="form-page">
      <PageHeader title={banner.title} crumbs={[{ label: "Bannerlar", href: "/content/banners" }]} />
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Değişiklikler kaydedildi. Sitede 1 dakika içinde görünür.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <BannerForm banner={banner} />
      </Panel>
      <Panel title="Banner’ı sil" padded>
        <form action={withBase(`/api/content/banners/${banner.id}`)} method="post">
          <input type="hidden" name="_action" value="delete" />
          <ConfirmButton className="btn btn-danger" message={`“${banner.title}” silinsin mi?`}>
            <IconTrash />
            Sil
          </ConfirmButton>
        </form>
      </Panel>
    </div>
  );
}

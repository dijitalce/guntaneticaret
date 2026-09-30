import { notFound } from "next/navigation";
import { getPopup } from "@guntan/db";
import { ConfirmButton } from "@/src/form-fields";
import { IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { PopupForm } from "@/src/popup-form";
import { Alert, PageHeader, Panel, StatusBadge } from "@/src/ui";
import { StatRow, percent } from "@/src/ui-ext";

export const metadata = { title: "Popup" };
export const dynamic = "force-dynamic";

export default async function PopupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const popup = await getPopup(id);
  if (!popup) notFound();
  const views = Number(popup.views);
  return (
    <>
      <PageHeader
        title={popup.name}
        description={popup.title}
        crumbs={[{ href: "/marketing/popups", label: "Popup'lar" }]}
        actions={<StatusBadge tone={popup.is_active ? "ok" : "neutral"}>{popup.is_active ? "Yayında" : "Kapalı"}</StatusBadge>}
      />
      {sp.ok === "olusturuldu" ? <Alert tone="ok">Popup oluşturuldu. Yayına almak için “Yayında” seçeneğini açıp kaydedin.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Kaydedildi. Sitede 1 dakika içinde güncellenir.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <StatRow
          items={[
            { label: "Görüntülenme", value: views.toLocaleString("tr-TR") },
            { label: "Tıklama", value: Number(popup.clicks).toLocaleString("tr-TR"), hint: percent(Number(popup.clicks), views) },
            { label: "E-posta kaydı", value: Number(popup.leads).toLocaleString("tr-TR"), hint: `Dönüşüm ${percent(Number(popup.leads), views)}` },
          ]}
        />
      </Panel>
      <div className="form-page is-wide">
        <Panel padded>
          <PopupForm popup={popup} />
        </Panel>
        <Panel padded>
          <form action={withBase(`/api/popups/${id}`)} method="post" className="danger-zone">
            <input type="hidden" name="_action" value="delete" />
            <div>
              <strong>Popup&apos;ı sil</strong>
              <small>Toplanan aboneler silinmez.</small>
            </div>
            <ConfirmButton className="btn btn-danger btn-sm" message="Popup silinsin mi?">
              <IconTrash />
              Sil
            </ConfirmButton>
          </form>
        </Panel>
      </div>
    </>
  );
}

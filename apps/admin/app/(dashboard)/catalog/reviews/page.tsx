import { listReviewsForAdmin, reviewStatusCounts, type ReviewStatus } from "@guntan/db";
import { ConfirmButton } from "@/src/form-fields";
import { withBase } from "@/src/paths";
import { storefrontUrl } from "@/src/storefront";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate, type Tone } from "@/src/ui";
import { TabNav } from "@/src/ui-ext";

export const metadata = { title: "Ürün değerlendirmeleri" };
export const dynamic = "force-dynamic";

const FILTERS = ["pending", "approved", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  pending: { label: "Onay bekliyor", tone: "warn" },
  approved: { label: "Yayında", tone: "ok" },
  rejected: { label: "Reddedildi", tone: "bad" },
};

const OK_MESSAGE: Record<string, string> = {
  approved: "Değerlendirme yayına alındı.",
  rejected: "Değerlendirme reddedildi.",
  deleted: "Değerlendirme silindi.",
};

function stars(rating: number) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ durum?: string; ok?: string }> }) {
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.durum as Filter) ? (sp.durum as Filter) : "pending";
  const [reviews, counts] = await Promise.all([listReviewsForAdmin(filter), reviewStatusCounts()]);
  const site = storefrontUrl();
  const back = `/catalog/reviews?durum=${filter}`;

  return (
    <>
      <PageHeader
        title="Ürün değerlendirmeleri"
        description="Yalnızca ürünü satın alıp kargoya verilmiş ya da teslim edilmiş müşteriler değerlendirme yazabilir. Onayladığınız yorumlar ürün sayfasında ve Google arama sonuçlarındaki yıldızlarda görünür."
      />
      <TabNav
        label="Değerlendirme durumları"
        active={filter}
        items={[
          { key: "pending", label: "Onay bekleyen", href: "/catalog/reviews?durum=pending", count: counts.pending },
          { key: "approved", label: "Yayında", href: "/catalog/reviews?durum=approved", count: counts.approved },
          { key: "rejected", label: "Reddedilen", href: "/catalog/reviews?durum=rejected", count: counts.rejected },
          { key: "all", label: "Tümü", href: "/catalog/reviews?durum=all" },
        ]}
      />
      {sp.ok && OK_MESSAGE[sp.ok] ? <Alert tone="ok">{OK_MESSAGE[sp.ok]}</Alert> : null}
      <Panel>
        {reviews.length === 0 ? (
          <EmptyState
            title={filter === "pending" ? "Onay bekleyen değerlendirme yok" : "Değerlendirme yok"}
            description="Müşteriler teslim aldıkları ürünleri değerlendirdikçe burada listelenir."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Puan ve yorum</th>
                  <th>Müşteri</th>
                  <th>Durum</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 260 }}>
                      {r.product_slug ? (
                        <a href={`${site}/urun/${r.product_slug}#degerlendirmeler`} target="_blank" rel="noreferrer">
                          <strong>{r.product_name ?? "Ürün"}</strong>
                        </a>
                      ) : (
                        <strong>{r.product_name ?? "Silinmiş ürün"}</strong>
                      )}
                      {r.order_no ? <div className="muted text-sm">Sipariş {r.order_no}</div> : null}
                    </td>
                    <td style={{ maxWidth: 420 }}>
                      <div style={{ color: "#f5a524", letterSpacing: "0.08em" }} aria-label={`${r.rating} yıldız`}>{stars(Number(r.rating))}</div>
                      {r.title ? <strong>{r.title}</strong> : null}
                      <div className="text-sm" style={{ whiteSpace: "pre-line" }}>{r.body}</div>
                    </td>
                    <td>
                      <div>{r.author_name}</div>
                      <div className="muted text-sm">{r.customer_email ?? "—"}</div>
                      <div className="muted text-sm">{formatDate(r.created_at)}</div>
                    </td>
                    <td>
                      <StatusBadge tone={STATUS[r.status]?.tone ?? "neutral"}>{STATUS[r.status]?.label ?? r.status}</StatusBadge>
                    </td>
                    <td>
                      <form action={withBase(`/api/reviews/${r.id}`)} method="post" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        <input type="hidden" name="back" value={back} />
                        {r.status !== "approved" ? (
                          <button className="btn btn-primary btn-xs" type="submit" name="_action" value="approve">Yayına al</button>
                        ) : null}
                        {r.status !== "rejected" ? (
                          <button className="btn btn-ghost btn-xs" type="submit" name="_action" value="reject">Reddet</button>
                        ) : null}
                        <ConfirmButton className="btn btn-ghost btn-xs" name="_action" value="delete" message="Bu değerlendirme kalıcı olarak silinsin mi?">
                          Sil
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

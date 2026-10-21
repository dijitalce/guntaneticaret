import Link from "next/link";
import type { PublicReview, ReviewStatus, ReviewSummary } from "@guntan/db";
import { formatDateTr } from "./order-labels";

export type ReviewViewer =
  | { kind: "guest" }
  | { kind: "ineligible" }
  | { kind: "eligible"; existing: { rating: number; title: string | null; body: string; status: ReviewStatus } | null };

const RESULT: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Teşekkürler! Değerlendirmen onaylandıktan sonra yayınlanacak." },
  puan: { ok: false, text: "Lütfen 1 ile 5 arasında bir puan seçin." },
  metin: { ok: false, text: "Yorum en az 10, en fazla 2000 karakter olmalı." },
  yetki: { ok: false, text: "Bu ürünü yalnızca satın alıp teslim alan müşteriler değerlendirebilir." },
  hata: { ok: false, text: "Değerlendirme kaydedilemedi. Lütfen tekrar deneyin." },
};

export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={`5 üzerinden ${value.toLocaleString("tr-TR")} puan`}>
      <span className="stars-base" aria-hidden>★★★★★</span>
      <span className="stars-fill" style={{ width: `${pct}%` }} aria-hidden>★★★★★</span>
    </span>
  );
}

function ReviewForm({ productId, existing }: { productId: string; existing: Extract<ReviewViewer, { kind: "eligible" }>["existing"] }) {
  return (
    <form action="/api/reviews" method="post" className="account-panel review-form">
      <h3>{existing ? "Değerlendirmeni güncelle" : "Bu ürünü değerlendir"}</h3>
      {existing?.status === "pending" && <p className="muted">Önceki değerlendirmen onay bekliyor.</p>}
      <input type="hidden" name="productId" value={productId} />
      <fieldset className="review-rating-input">
        <legend>Puanınız</legend>
        <div className="review-rating-stars">
          {[5, 4, 3, 2, 1].map((n) => (
            <span key={n}>
              <input type="radio" id={`rating-${n}`} name="rating" value={n} required defaultChecked={existing?.rating === n} />
              <label htmlFor={`rating-${n}`} title={`${n} yıldız`}>
                <span className="sr-only">{n} yıldız</span>★
              </label>
            </span>
          ))}
        </div>
      </fieldset>
      <label>
        Başlık (isteğe bağlı)
        <input className="input" name="title" maxLength={150} defaultValue={existing?.title ?? ""} />
      </label>
      <label>
        Yorumun
        <textarea name="body" rows={4} minLength={10} maxLength={2000} required defaultValue={existing?.body ?? ""} placeholder="Ürünün kalitesi, aracınıza uyumu, paketleme…" />
      </label>
      <button className="btn btn-primary" type="submit">Değerlendirmeyi gönder</button>
      <p className="muted review-form-note">Değerlendirmeler onaylandıktan sonra adının baş harfiyle birlikte yayınlanır.</p>
    </form>
  );
}

export function ProductReviews({
  productId,
  summary,
  reviews,
  viewer,
  result,
}: {
  productId: string;
  summary: ReviewSummary;
  reviews: PublicReview[];
  viewer: ReviewViewer;
  result?: string;
}) {
  const notice = result ? RESULT[result] : undefined;
  return (
    <section className="reviews" aria-labelledby="degerlendirmeler">
      <h2 className="pdp-section" id="degerlendirmeler">
        Değerlendirmeler{summary.count > 0 ? ` (${summary.count})` : ""}
      </h2>
      {notice && (
        <p className={`account-alert ${notice.ok ? "is-ok" : "is-bad"}`} role={notice.ok ? "status" : "alert"}>
          {notice.text}
        </p>
      )}
      <div className="reviews-layout">
        <div className="reviews-summary">
          {summary.count > 0 ? (
            <>
              <div className="reviews-score">
                <strong>{summary.average.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}</strong>
                <div>
                  <Stars value={summary.average} size="lg" />
                  <span className="muted">{summary.count} değerlendirme</span>
                </div>
              </div>
              <ul className="reviews-bars">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = summary.distribution[n - 1] ?? 0;
                  return (
                    <li key={n}>
                      <span>{n} ★</span>
                      <span className="reviews-bar"><span style={{ width: `${(c / summary.count) * 100}%` }} /></span>
                      <span className="muted">{c}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="reviews-empty">
              <Stars value={0} size="lg" />
              <strong>Henüz değerlendirme yok</strong>
              <p className="muted">Bu ürünü satın aldıysan ilk değerlendiren sen ol.</p>
            </div>
          )}

          {viewer.kind === "guest" && (
            <p className="reviews-cta">
              Değerlendirme yazmak için <Link href="/hesabim">giriş yap</Link>. Yalnızca ürünü satın alan müşteriler değerlendirebilir.
            </p>
          )}
          {viewer.kind === "ineligible" && (
            <p className="reviews-cta muted">Bu ürünü satın alıp teslim aldıktan sonra değerlendirebilirsiniz.</p>
          )}
          {viewer.kind === "eligible" && <ReviewForm productId={productId} existing={viewer.existing} />}
        </div>

        {reviews.length > 0 && (
          <ol className="reviews-list">
            {reviews.map((r) => (
              <li key={r.id} className="review">
                <div className="review-head">
                  <Stars value={Number(r.rating)} size="sm" />
                  {r.title && <strong>{r.title}</strong>}
                </div>
                <p>{r.body}</p>
                <div className="review-meta muted">
                  <span>{r.author_name}</span>
                  <span className="review-verified">Doğrulanmış alıcı</span>
                  <time dateTime={new Date(r.created_at).toISOString()}>{formatDateTr(r.created_at)}</time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

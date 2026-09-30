import Link from "next/link";
import type { Metadata } from "next";
import { verifyUnsubscribe } from "@guntan/db";

export const metadata: Metadata = { title: "E-posta aboneliği", robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; k?: string; tamam?: string }>;
}) {
  const sp = await searchParams;
  const email = sp.e ?? "";
  const valid = Boolean(email && sp.k && verifyUnsubscribe(email, sp.k));

  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › E-posta aboneliği
      </nav>
      <section className="checkout-form-card" style={{ maxWidth: 560, margin: "1rem auto" }}>
        <h1 style={{ margin: "0 0 0.6rem", fontSize: "1.4rem" }}>E-posta aboneliği</h1>
        {sp.tamam === "1" ? (
          <p>Abonelikten çıkarıldınız. Artık kampanya e-postası almayacaksınız; sipariş bilgilendirmeleri gönderilmeye devam eder.</p>
        ) : valid ? (
          <form action="/api/marketing/unsubscribe" method="post">
            <input type="hidden" name="e" value={email} />
            <input type="hidden" name="k" value={sp.k} />
            <p>
              <strong>{email}</strong> adresine kampanya ve fırsat e-postaları gönderilmesin mi?
            </p>
            <button className="btn btn-primary" type="submit">
              Abonelikten çık
            </button>
          </form>
        ) : (
          <p>Bağlantı geçersiz veya süresi dolmuş. Aboneliğinizi sonlandırmak için bizimle iletişime geçebilirsiniz.</p>
        )}
      </section>
    </div>
  );
}

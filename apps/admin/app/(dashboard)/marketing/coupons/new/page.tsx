import { CouponForm } from "@/src/coupon-form";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni kupon" };

export default async function NewCouponPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Yeni kupon" crumbs={[{ href: "/marketing/coupons", label: "Kuponlar" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page">
        <Panel padded>
          <CouponForm />
        </Panel>
      </div>
    </>
  );
}

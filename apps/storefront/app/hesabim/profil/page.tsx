import { redirect } from "next/navigation";
import { getCurrentCustomer } from "../../../src/customer";
import { ProfileForms } from "../../../src/profile-forms";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentCustomer();
  if (!user) redirect("/hesabim");

  return (
    <ProfileForms
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        invoiceType: user.invoiceType,
        companyName: user.companyName,
        taxOffice: user.taxOffice,
        taxNumber: user.taxNumber,
        nationalId: user.nationalId,
      }}
      alerts={{ ok: sp.ok, hata: sp.hata }}
    />
  );
}

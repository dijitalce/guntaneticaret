import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { getCustomerBySession, updateCustomerProfile } from "@guntan/auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) return NextResponse.redirect(publicRedirect("/hesabim", request), 303);

  const form = await request.formData();
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const invoiceType = String(form.get("invoiceType") ?? "individual") === "corporate" ? "corporate" : "individual";
  const companyName = String(form.get("companyName") ?? "").trim();
  const taxOffice = String(form.get("taxOffice") ?? "").trim();
  const taxNumber = String(form.get("taxNumber") ?? "").trim();
  const nationalId = String(form.get("nationalId") ?? "").trim();

  if (!firstName || !lastName) {
    return NextResponse.redirect(publicRedirect("/hesabim/profil?hata=1", request), 303);
  }
  if (invoiceType === "corporate" && (!companyName || !taxOffice || !taxNumber)) {
    return NextResponse.redirect(publicRedirect("/hesabim/profil?hata=1", request), 303);
  }

  await updateCustomerProfile(user.id, {
    firstName,
    lastName,
    phone: phone || null,
    invoiceType,
    companyName,
    taxOffice,
    taxNumber,
    nationalId,
  });
  return NextResponse.redirect(publicRedirect("/hesabim/profil?ok=1", request), 303);
}

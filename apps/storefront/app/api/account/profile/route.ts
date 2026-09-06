import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { getCustomerBySession, updateCustomerProfile } from "@guntan/auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) return NextResponse.redirect(new URL("/hesabim", request.url), 303);

  const form = await request.formData();
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.redirect(new URL("/hesabim/profil?hata=1", request.url), 303);
  }

  await updateCustomerProfile(user.id, { firstName, lastName, phone: phone || null });
  return NextResponse.redirect(new URL("/hesabim/profil?ok=1", request.url), 303);
}

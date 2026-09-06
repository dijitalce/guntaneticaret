import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { changeCustomerPassword, getCustomerBySession } from "@guntan/auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) return NextResponse.redirect(new URL("/hesabim", request.url), 303);

  const form = await request.formData();
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirm = String(form.get("newPasswordConfirm") ?? "");
  if (newPassword.length < 6 || newPassword !== confirm) {
    return NextResponse.redirect(new URL("/hesabim/profil?hata=sifre", request.url), 303);
  }

  const ok = await changeCustomerPassword(user.id, currentPassword, newPassword);
  if (!ok) return NextResponse.redirect(new URL("/hesabim/profil?hata=sifre", request.url), 303);
  return NextResponse.redirect(new URL("/hesabim/profil?ok=1", request.url), 303);
}

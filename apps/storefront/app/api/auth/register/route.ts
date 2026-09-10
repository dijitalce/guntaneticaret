import { NextResponse } from "next/server";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { createCustomer, loginCustomer } from "@guntan/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const firstName = String(form.get("firstName") ?? "");
  const lastName = String(form.get("lastName") ?? "");
  const phone = String(form.get("phone") ?? "").trim() || undefined;

  if (!email || !password || password.length < 6 || !firstName || !lastName) {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=1", request), 303);
  }

  try {
    await createCustomer({ email, password, firstName, lastName, phone });
  } catch {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=email", request), 303);
  }

  const result = await loginCustomer(email, password);
  const res = NextResponse.redirect(publicRedirect("/hesabim?kayit=1", request), 303);
  if (result) {
    res.cookies.set(COOKIE_CUSTOMER_SESSION, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return res;
}

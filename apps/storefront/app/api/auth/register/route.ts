import { NextResponse } from "next/server";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { createCustomer, loginCustomer } from "@guntan/auth";

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = field(form, "email");
  const password = field(form, "password");
  const firstName = field(form, "firstName");
  const lastName = field(form, "lastName");
  const phone = field(form, "phone") || undefined;

  if (field(form, "acceptTerms") !== "1" || field(form, "acceptPrivacy") !== "1") {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=onay", request), 303);
  }

  if (!email || !password || password.length < 6 || !firstName || !lastName) {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=eksik", request), 303);
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

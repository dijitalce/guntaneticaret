import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { loginCustomer } from "@guntan/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await loginCustomer(String(form.get("email")), String(form.get("password")));
  if (!result) return NextResponse.redirect(new URL("/hesabim?hata=1", request.url), 303);
  const res = NextResponse.redirect(new URL("/hesabim", request.url), 303);
  res.cookies.set(COOKIE_CUSTOMER_SESSION, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

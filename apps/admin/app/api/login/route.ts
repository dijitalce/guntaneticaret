import { NextResponse } from "next/server";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { loginAdmin } from "@guntan/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await loginAdmin(String(form.get("email")), String(form.get("password")));
  if (!result) return NextResponse.redirect(new URL("/login?hata=1", request.url), 303);
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(COOKIE_ADMIN_SESSION, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

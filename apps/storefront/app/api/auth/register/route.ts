import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { createCustomer, loginCustomer } from "@guntan/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  await createCustomer({
    email: String(form.get("email")),
    password: String(form.get("password")),
    firstName: String(form.get("firstName")),
    lastName: String(form.get("lastName")),
  });
  const result = await loginCustomer(String(form.get("email")), String(form.get("password")));
  const res = NextResponse.redirect(new URL("/hesabim", request.url), 303);
  if (result) {
    res.cookies.set(COOKIE_CUSTOMER_SESSION, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return res;
}

import { NextResponse } from "next/server";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { logoutCustomer } from "@guntan/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  if (token) await logoutCustomer(token);
  const res = NextResponse.redirect(publicRedirect("/hesabim", request), 303);
  res.cookies.delete(COOKIE_CUSTOMER_SESSION);
  return res;
}

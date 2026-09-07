import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { logoutAdmin } from "@guntan/auth";
import { adminRedirect } from "../../../src/paths";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  if (token) await logoutAdmin(token);
  const res = NextResponse.redirect(adminRedirect("/login", request), 303);
  res.cookies.delete(COOKIE_ADMIN_SESSION);
  return res;
}

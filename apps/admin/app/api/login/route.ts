import { NextResponse } from "next/server";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { loginAdmin } from "@guntan/auth";
import { recordAdminLogin } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../src/paths";

function clientIp(request: Request) {
  const raw =
    request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "";
  const ip = raw.trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const result = await loginAdmin(email, String(form.get("password")));
  const ip = clientIp(request);
  if (!result) {
    await writeAudit({ actorEmail: email.slice(0, 191), entity: "admin_session", entityId: "login", action: "login_failed", ip: ip ?? undefined }).catch(
      () => undefined,
    );
    return NextResponse.redirect(adminRedirect("/login?hata=1", request), 303);
  }
  await recordAdminLogin(result.user.id, ip).catch(() => undefined);
  await writeAudit({
    actorId: result.user.id,
    actorEmail: result.user.email,
    entity: "admin_session",
    entityId: result.user.id,
    action: "login",
    after: { userAgent: request.headers.get("user-agent")?.slice(0, 200) },
    ip: ip ?? undefined,
  }).catch(() => undefined);
  const res = NextResponse.redirect(adminRedirect("/", request), 303);
  res.cookies.set(COOKIE_ADMIN_SESSION, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

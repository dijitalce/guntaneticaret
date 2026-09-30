import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { hashPassword, hashToken, verifyPassword } from "@guntan/auth";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { adminSessions, adminUsers, db, getAdminMeta, saveAdminMeta } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const id = session.user.id;
  const audit = (act: string, before?: unknown, after?: unknown) =>
    writeAudit({ actorId: id, actorEmail: session.user.email, entity: "admin_user", entityId: id, action: act, before, after });

  if (action === "password") {
    const current = text(form, "current");
    const next = text(form, "password");
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    if (!user || !verifyPassword(current, user.passwordHash)) return redirectTo(request, "/profile", { hata: "Mevcut şifre hatalı." });
    if (next.length < 10) return redirectTo(request, "/profile", { hata: "Yeni şifre en az 10 karakter olmalı." });
    if (next !== text(form, "password2")) return redirectTo(request, "/profile", { hata: "Yeni şifreler eşleşmiyor." });
    await db.update(adminUsers).set({ passwordHash: hashPassword(next) }).where(eq(adminUsers.id, id));
    const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
    if (token) await db.delete(adminSessions).where(and(eq(adminSessions.adminUserId, id), ne(adminSessions.tokenHash, hashToken(token))));
    await audit("password_change");
    return redirectTo(request, "/profile", { ok: "sifre" });
  }

  if (action === "revoke_others") {
    const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
    if (token) await db.delete(adminSessions).where(and(eq(adminSessions.adminUserId, id), ne(adminSessions.tokenHash, hashToken(token))));
    await audit("revoke_sessions");
    return redirectTo(request, "/profile", { ok: "oturumlar" });
  }

  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirectTo(request, "/profile", { hata: "Ad ve geçerli bir e-posta girin." });
  if (email !== session.user.email) {
    const [dup] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (dup) return redirectTo(request, "/profile", { hata: "Bu e-posta başka bir kullanıcıda kayıtlı." });
  }
  const meta = await getAdminMeta(id);
  await db.update(adminUsers).set({ name, email }).where(eq(adminUsers.id, id));
  const phone = text(form, "phone") || null;
  const title = text(form, "title") || null;
  await saveAdminMeta(id, { role: meta.role, phone, title });
  await audit("update", { name: session.user.name, email: session.user.email, phone: meta.phone, title: meta.title }, { name, email, phone, title });
  return redirectTo(request, "/profile", { ok: "kaydedildi" });
}

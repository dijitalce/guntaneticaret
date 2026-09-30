import { eq } from "drizzle-orm";
import { hashPassword } from "@guntan/auth";
import { ADMIN_ROLES, adminUsers, db, getAdminMeta, newId, saveAdminMeta } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const me = await getAdminMeta(session.user.id);
  if (!["owner", "admin"].includes(me.role)) return redirectTo(request, "/system/users", { hata: "Kullanıcı eklemek için yönetici yetkisi gerekir." });
  const form = await request.formData();
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const role = ADMIN_ROLES.some((r) => r.key === text(form, "role")) ? text(form, "role") : "support";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirectTo(request, "/system/users/new", { hata: "Ad ve geçerli bir e-posta girin." });
  if (password.length < 10) return redirectTo(request, "/system/users/new", { hata: "Şifre en az 10 karakter olmalı." });
  if (role === "owner" && me.role !== "owner") return redirectTo(request, "/system/users/new", { hata: "Sahip rolünü yalnızca sahip atayabilir." });
  const [exists] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (exists) return redirectTo(request, "/system/users/new", { hata: "Bu e-posta ile bir kullanıcı zaten var." });
  const id = newId();
  await db.insert(adminUsers).values({ id, name, email, passwordHash: hashPassword(password), isActive: "true" });
  await saveAdminMeta(id, { role, phone: text(form, "phone") || null, title: text(form, "title") || null });
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "admin_user",
    entityId: id,
    action: "create",
    after: { name, email, role },
  });
  return redirectTo(request, `/system/users/${id}`, { ok: "olusturuldu" });
}

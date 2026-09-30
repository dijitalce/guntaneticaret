import { and, eq, ne, sql } from "drizzle-orm";
import { hashPassword } from "@guntan/auth";
import { ADMIN_ROLES, adminSessions, adminUsers, db, getAdminMeta, listAdminMeta, saveAdminMeta } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const back = `/system/users/${id}`;
  const me = await getAdminMeta(session.user.id);
  if (!["owner", "admin"].includes(me.role)) return redirectTo(request, back, { hata: "Bu işlem için yönetici yetkisi gerekir." });
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!user) return redirectTo(request, "/system/users", { hata: "Kullanıcı bulunamadı." });
  const meta = await getAdminMeta(id);
  if (meta.role === "owner" && me.role !== "owner") return redirectTo(request, back, { hata: "Sahip hesabını yalnızca sahip değiştirebilir." });
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const isSelf = id === session.user.id;
  const audit = (act: string, before?: unknown, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "admin_user", entityId: id, action: act, before, after });

  const activeAdmins = async () => {
    const all = await db.select({ id: adminUsers.id }).from(adminUsers).where(and(eq(adminUsers.isActive, "true"), ne(adminUsers.id, id)));
    const metas = await listAdminMeta();
    return all.filter((u) => ["owner", "admin"].includes(metas.get(u.id)?.role ?? "admin")).length;
  };

  if (action === "delete") {
    if (isSelf) return redirectTo(request, back, { hata: "Kendi hesabınızı silemezsiniz." });
    if ((await activeAdmins()) === 0) return redirectTo(request, back, { hata: "Son yönetici hesabı silinemez." });
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    await db.execute(sql`delete from admin_user_meta where admin_user_id = ${id}`);
    await audit("delete", { name: user.name, email: user.email, role: meta.role });
    return redirectTo(request, "/system/users", { ok: "silindi" });
  }

  if (action === "password") {
    const password = text(form, "password");
    if (password.length < 10) return redirectTo(request, back, { hata: "Yeni şifre en az 10 karakter olmalı." });
    await db.update(adminUsers).set({ passwordHash: hashPassword(password) }).where(eq(adminUsers.id, id));
    if (!isSelf) await db.delete(adminSessions).where(eq(adminSessions.adminUserId, id));
    await audit("password_reset");
    return redirectTo(request, back, { ok: "sifre" });
  }

  if (action === "revoke") {
    await db.delete(adminSessions).where(eq(adminSessions.adminUserId, id));
    await audit("revoke_sessions");
    if (isSelf) return redirectTo(request, "/login");
    return redirectTo(request, back, { ok: "oturumlar" });
  }

  if (action === "toggle") {
    if (isSelf) return redirectTo(request, back, { hata: "Kendi hesabınızı pasif yapamazsınız." });
    const next = user.isActive === "true" ? "false" : "true";
    if (next === "false" && (await activeAdmins()) === 0) return redirectTo(request, back, { hata: "Son aktif yönetici pasif yapılamaz." });
    await db.update(adminUsers).set({ isActive: next }).where(eq(adminUsers.id, id));
    if (next === "false") await db.delete(adminSessions).where(eq(adminSessions.adminUserId, id));
    await audit(next === "true" ? "activate" : "deactivate");
    return redirectTo(request, back, { ok: next === "true" ? "aktif" : "pasif" });
  }

  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const role = ADMIN_ROLES.some((r) => r.key === text(form, "role")) ? text(form, "role") : meta.role;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirectTo(request, back, { hata: "Ad ve geçerli bir e-posta girin." });
  if (role === "owner" && me.role !== "owner") return redirectTo(request, back, { hata: "Sahip rolünü yalnızca sahip atayabilir." });
  if (isSelf && !["owner", "admin"].includes(role)) return redirectTo(request, back, { hata: "Kendi yönetici yetkinizi kaldıramazsınız." });
  if (["owner", "admin"].includes(meta.role) && !["owner", "admin"].includes(role) && (await activeAdmins()) === 0) {
    return redirectTo(request, back, { hata: "Son yöneticinin rolü düşürülemez." });
  }
  if (email !== user.email) {
    const [dup] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (dup) return redirectTo(request, back, { hata: "Bu e-posta başka bir kullanıcıda kayıtlı." });
  }
  await db.update(adminUsers).set({ name, email }).where(eq(adminUsers.id, id));
  const phone = text(form, "phone") || null;
  const title = text(form, "title") || null;
  await saveAdminMeta(id, { role, phone, title });
  await audit("update", { name: user.name, email: user.email, role: meta.role, phone: meta.phone, title: meta.title }, { name, email, role, phone, title });
  return redirectTo(request, back, { ok: "kaydedildi" });
}

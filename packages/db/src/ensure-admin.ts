import { randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { ADMIN_PERMISSION, ADMIN_ROLE, ROLE_PERMISSIONS } from "@guntan/types";
import { db, pg } from "./client";
import {
  adminUserRoles,
  adminUsers,
  permissions,
  rolePermissions,
  roles,
} from "./schema/system";

const EMAIL = (process.env.ADMIN_EMAIL ?? "admin@guntan.local").toLowerCase().trim();
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123!";
const NAME = process.env.ADMIN_NAME ?? "Süper Admin";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function ensureRbac() {
  const existingPerms = await db.select().from(permissions);
  const permByKey = Object.fromEntries(existingPerms.map((p) => [p.key, p.id]));
  for (const key of Object.values(ADMIN_PERMISSION)) {
    if (permByKey[key]) continue;
    const [row] = await db.insert(permissions).values({ key, name: key }).returning();
    permByKey[key] = row!.id;
  }

  const existingRoles = await db.select().from(roles);
  const roleByKey = Object.fromEntries(existingRoles.map((r) => [r.key, r.id]));
  for (const key of Object.values(ADMIN_ROLE)) {
    if (roleByKey[key]) continue;
    const [row] = await db.insert(roles).values({ key, name: key }).returning();
    roleByKey[key] = row!.id;
  }

  for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleByKey[roleKey];
    if (!roleId) continue;
    for (const p of perms) {
      const permissionId = permByKey[p];
      if (!permissionId) continue;
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId })
        .onConflictDoNothing();
    }
  }

  return roleByKey;
}

async function main() {
  const roleByKey = await ensureRbac();
  const superRoleId = roleByKey[ADMIN_ROLE.SUPER_ADMIN];
  if (!superRoleId) throw new Error("super_admin rolü oluşturulamadı");

  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, EMAIL)).limit(1);
  let adminId: string;

  if (existing) {
    await db
      .update(adminUsers)
      .set({
        passwordHash: hashPassword(PASSWORD),
        name: NAME,
        isActive: "true",
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing.id));
    adminId = existing.id;
    console.log(`Admin şifresi güncellendi: ${EMAIL}`);
  } else {
    const [created] = await db
      .insert(adminUsers)
      .values({
        email: EMAIL,
        name: NAME,
        passwordHash: hashPassword(PASSWORD),
        isActive: "true",
      })
      .returning();
    adminId = created!.id;
    console.log(`Admin oluşturuldu: ${EMAIL}`);
  }

  await db
    .insert(adminUserRoles)
    .values({ adminUserId: adminId, roleId: superRoleId })
    .onConflictDoNothing();

  console.log(`Giriş: ${EMAIL} / ${PASSWORD}`);
  await pg.end();
}

main().catch(async (err) => {
  console.error(err);
  await pg.end();
  process.exit(1);
});

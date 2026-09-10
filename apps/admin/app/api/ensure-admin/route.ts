import { NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { ADMIN_PERMISSION, ADMIN_ROLE, ROLE_PERMISSIONS } from "@guntan/types";
import {
  adminUserRoles,
  adminUsers,
  db,
  newId,
  permissions,
  rolePermissions,
  roles,
} from "@guntan/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function authorized(request: Request): boolean {
  const expected = process.env.BETTER_AUTH_SECRET ?? "";
  if (!expected || expected.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function ensureRbac() {
  const existingPerms = await db.select().from(permissions);
  const permByKey = Object.fromEntries(existingPerms.map((p) => [p.key, p.id]));
  for (const key of Object.values(ADMIN_PERMISSION)) {
    if (permByKey[key]) continue;
    const id = newId();
    await db.insert(permissions).values({ id, key, name: key });
    permByKey[key] = id;
  }

  const existingRoles = await db.select().from(roles);
  const roleByKey = Object.fromEntries(existingRoles.map((r) => [r.key, r.id]));
  for (const key of Object.values(ADMIN_ROLE)) {
    if (roleByKey[key]) continue;
    const id = newId();
    await db.insert(roles).values({ id, key, name: key });
    roleByKey[key] = id;
  }

  for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleByKey[roleKey];
    if (!roleId) continue;
    for (const p of perms) {
      const permissionId = permByKey[p];
      if (!permissionId) continue;
      await db.insert(rolePermissions).ignore().values({ roleId, permissionId });
    }
  }
  return roleByKey;
}

/** POST /yonetim/api/ensure-admin  Authorization: Bearer $BETTER_AUTH_SECRET */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    name?: string;
  };
  const email = (body.email ?? "admin@guntan.local").toLowerCase().trim();
  const password = body.password ?? "Admin123!";
  const name = body.name ?? "Süper Admin";

  const roleByKey = await ensureRbac();
  const superRoleId = roleByKey[ADMIN_ROLE.SUPER_ADMIN];
  if (!superRoleId) {
    return NextResponse.json({ ok: false, error: "role_missing" }, { status: 500 });
  }

  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  let adminId: string;
  let action: "created" | "updated";

  if (existing) {
    await db
      .update(adminUsers)
      .set({
        passwordHash: hashPassword(password),
        name,
        isActive: "true",
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing.id));
    adminId = existing.id;
    action = "updated";
  } else {
    adminId = newId();
    await db
      .insert(adminUsers)
      .values({ id: adminId, email, name, passwordHash: hashPassword(password), isActive: "true" });
    action = "created";
  }

  await db.insert(adminUserRoles).ignore().values({ adminUserId: adminId, roleId: superRoleId });

  return NextResponse.json({ ok: true, action, email });
}

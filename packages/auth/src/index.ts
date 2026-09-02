import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  adminSessions,
  adminUserRoles,
  adminUsers,
  customerSessions,
  customers,
  db,
  rolePermissions,
  roles,
  permissions as permissionTable,
} from "@guntan/db";
import type { AdminPermission } from "@guntan/types";

const SESSION_DAYS = 14;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiryIso(days = SESSION_DAYS): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export async function createCustomer({
  email,
  password,
  firstName,
  lastName,
  phone,
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const [row] = await db
    .insert(customers)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      firstName,
      lastName,
      phone,
    })
    .returning();
  return row!;
}

export async function loginCustomer(email: string, password: string) {
  const [user] = await db.select().from(customers).where(eq(customers.email, email.toLowerCase().trim())).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  const token = randomBytes(32).toString("hex");
  await db.insert(customerSessions).values({
    customerId: user.id,
    tokenHash: hashToken(token),
    expiresAt: expiryIso(),
  });
  return { token, user };
}

export async function getCustomerBySession(token: string) {
  const [session] = await db
    .select()
    .from(customerSessions)
    .where(eq(customerSessions.tokenHash, hashToken(token)))
    .limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(customers).where(eq(customers.id, session.customerId)).limit(1);
  return user ?? null;
}

export async function logoutCustomer(token: string) {
  await db.delete(customerSessions).where(eq(customerSessions.tokenHash, hashToken(token)));
}

export async function loginAdmin(email: string, password: string) {
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase().trim())).limit(1);
  if (!user || user.isActive !== "true" || !verifyPassword(password, user.passwordHash)) return null;
  const token = randomBytes(32).toString("hex");
  await db.insert(adminSessions).values({
    adminUserId: user.id,
    tokenHash: hashToken(token),
    expiresAt: expiryIso(),
  });
  return { token, user };
}

export async function getAdminBySession(token: string) {
  const [session] = await db
    .select()
    .from(adminSessions)
    .where(eq(adminSessions.tokenHash, hashToken(token)))
    .limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.adminUserId)).limit(1);
  if (!user) return null;
  const perms = await db
    .select({ key: permissionTable.key })
    .from(adminUserRoles)
    .innerJoin(roles, eq(adminUserRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissionTable, eq(rolePermissions.permissionId, permissionTable.id))
    .where(eq(adminUserRoles.adminUserId, user.id));
  return { user, permissions: [...new Set(perms.map((p) => p.key))] as AdminPermission[] };
}

export async function logoutAdmin(token: string) {
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
}

export function hasPermission(granted: readonly string[], needed: AdminPermission): boolean {
  return granted.includes(needed);
}

import {
  char,
  index,
  json,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "./common";

export const adminUsers = mysqlTable("admin_users", {
  id,
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: varchar("is_active", { length: 16 }).notNull().default("true"),
  ...timestamps,
}, (t) => [
  uniqueIndex("admin_users_email_uidx").on(t.email),
]);

export const adminSessions = mysqlTable("admin_sessions", {
  id,
  adminUserId: char("admin_user_id", { length: 36 }).notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  expiresAt: varchar("expires_at", { length: 64 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("admin_sessions_token_uidx").on(t.tokenHash),
]);

export const roles = mysqlTable("roles", {
  id,
  key: varchar("key", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("roles_key_uidx").on(t.key),
]);

export const permissions = mysqlTable("permissions", {
  id,
  key: varchar("key", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("permissions_key_uidx").on(t.key),
]);

export const rolePermissions = mysqlTable("role_permissions", {
  roleId: char("role_id", { length: 36 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: char("permission_id", { length: 36 }).notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.roleId, t.permissionId] }),
]);

export const adminUserRoles = mysqlTable("admin_user_roles", {
  adminUserId: char("admin_user_id", { length: 36 }).notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  roleId: char("role_id", { length: 36 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.adminUserId, t.roleId] }),
]);

export const auditLogs = mysqlTable("audit_logs", {
  id,
  actorId: char("actor_id", { length: 36 }),
  actorEmail: varchar("actor_email", { length: 255 }),
  entity: varchar("entity", { length: 128 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  before: json("before"),
  after: json("after"),
  ip: varchar("ip", { length: 64 }),
  ...timestamps,
}, (t) => [
  index("audit_logs_entity_idx").on(t.entity, t.entityId),
]);

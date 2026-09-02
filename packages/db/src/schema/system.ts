import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";

export const adminUsers = pgTable("admin_users", {
  id,
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  isActive: text("is_active").notNull().default("true"),
  ...timestamps,
}, (t) => [
  uniqueIndex("admin_users_email_uidx").on(t.email),
]);

export const adminSessions = pgTable("admin_sessions", {
  id,
  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("admin_sessions_token_uidx").on(t.tokenHash),
]);

export const roles = pgTable("roles", {
  id,
  key: text("key").notNull(),
  name: text("name").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("roles_key_uidx").on(t.key),
]);

export const permissions = pgTable("permissions", {
  id,
  key: text("key").notNull(),
  name: text("name").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("permissions_key_uidx").on(t.key),
]);

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.roleId, t.permissionId] }),
]);

export const adminUserRoles = pgTable("admin_user_roles", {
  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.adminUserId, t.roleId] }),
]);

export const auditLogs = pgTable("audit_logs", {
  id,
  actorId: uuid("actor_id"),
  actorEmail: text("actor_email"),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: text("ip"),
  ...timestamps,
}, (t) => [
  index("audit_logs_entity_idx").on(t.entity, t.entityId),
]);

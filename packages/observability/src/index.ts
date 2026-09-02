import pino from "pino";
import { db, auditLogs } from "@guntan/db";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: process.env.SERVICE_NAME ?? "guntan" },
});

export async function writeAudit(input: {
  actorId?: string;
  actorEmail?: string;
  entity: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  await db.insert(auditLogs).values({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.ip,
  });
}

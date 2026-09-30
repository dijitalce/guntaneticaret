import { and, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { auditLogs, db } from "@guntan/db";

export type AuditFilters = {
  q?: string;
  kullanici?: string;
  kayit?: string;
  islem?: string;
  baslangic?: string;
  bitis?: string;
};

export function auditWhere(f: AuditFilters): SQL | undefined {
  const parts: SQL[] = [];
  if (f.kullanici) parts.push(eq(auditLogs.actorId, f.kullanici));
  if (f.kayit) parts.push(eq(auditLogs.entity, f.kayit));
  if (f.islem) parts.push(eq(auditLogs.action, f.islem));
  if (f.baslangic && /^\d{4}-\d{2}-\d{2}$/.test(f.baslangic)) parts.push(gte(auditLogs.createdAt, new Date(`${f.baslangic}T00:00:00`)));
  if (f.bitis && /^\d{4}-\d{2}-\d{2}$/.test(f.bitis)) parts.push(lte(auditLogs.createdAt, new Date(`${f.bitis}T23:59:59`)));
  if (f.q?.trim()) {
    const q = `%${f.q.trim()}%`;
    parts.push(or(like(auditLogs.entityId, q), like(auditLogs.actorEmail, q), like(auditLogs.ip, q), sql`cast(${auditLogs.after} as char) like ${q}`)!);
  }
  return parts.length ? and(...parts) : undefined;
}

export async function queryAudit(f: AuditFilters, limit: number, offset: number) {
  const where = auditWhere(f);
  const rows = await db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  const [count] = await db.select({ c: sql<number>`count(*)` }).from(auditLogs).where(where);
  return { rows, total: Number(count?.c ?? 0) };
}

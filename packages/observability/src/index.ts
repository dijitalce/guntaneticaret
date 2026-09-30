import pino from "pino";
import { db, auditLogs } from "@guntan/db";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: process.env.SERVICE_NAME ?? "guntan" },
});

/** İstek bağlamında çağrıldıysa istemci IP'sini okur; CLI/iş kuyruğunda null döner. */
async function requestIp(): Promise<string | undefined> {
  try {
    // @ts-ignore next yalnızca uygulamalarda kurulu; paket tek başına derlenirken çözülemez.
    const mod = (await import("next/headers")) as { headers: () => Promise<Headers> };
    const h = await mod.headers();
    const raw = h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "";
    const ip = raw.trim();
    return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : undefined;
  } catch {
    return undefined;
  }
}

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
  const ip = input.ip ?? (await requestIp());
  await db.insert(auditLogs).values({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
    ip,
  });
}

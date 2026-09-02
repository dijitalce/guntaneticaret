import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION, QUEUE_NAMES } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { runXmlImport } from "@guntan/import";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { id } = await ctx.params;
  try {
    const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
    const queue = new Queue(QUEUE_NAMES.XML_IMPORT, { connection });
    await queue.add("run", { feedId: id });
    await connection.quit();
  } catch {
    await runXmlImport(id);
  }
  return NextResponse.redirect(new URL("/integrations/xml", request.url), 303);
}

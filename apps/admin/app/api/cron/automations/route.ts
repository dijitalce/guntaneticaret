import { timingSafeEqual } from "node:crypto";
import { runAllAutomations } from "@guntan/db";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Harici cron için: /yonetim/api/cron/automations?key=CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const key = new URL(request.url).searchParams.get("key") ?? request.headers.get("x-cron-key") ?? "";
  if (!secret || !sameSecret(key, secret)) return new Response("Yetkisiz", { status: 401 });
  const result = await runAllAutomations();
  return Response.json(result);
}

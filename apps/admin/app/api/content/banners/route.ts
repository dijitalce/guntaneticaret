import { randomUUID } from "node:crypto";
import { banners, db } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo } from "../../../../src/api-helpers";
import { bannerFromForm } from "../../../../src/content-forms";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const input = bannerFromForm(await request.formData());
  if ("error" in input) return redirectTo(request, "/content/banners/new", { hata: input.error ?? "Geçersiz form." });
  const id = randomUUID();
  await db.insert(banners).values({ id, ...input });
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "banner", entityId: id, action: "create", after: input });
  return redirectTo(request, "/content/banners", { ok: "olusturuldu" });
}

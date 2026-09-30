import { tagList, getOrderTags, setOrderTags } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const before = await getOrderTags(id);
  const after = await setOrderTags(id, tagList(text(form, "tags")));
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "order", entityId: id, action: "tags", before, after });
  return redirectTo(request, `/orders/${id}`, { ok: "1" });
}

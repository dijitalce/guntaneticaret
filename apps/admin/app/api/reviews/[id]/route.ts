import { deleteReview, getReview, setReviewStatus } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const back = safeNext(form.get("back"), "/catalog/reviews");
  const review = await getReview(id);
  if (!review) return redirectTo(request, back);
  const action = text(form, "_action");
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "product_review", entityId: id, action: act, before: review, after });

  if (action === "approve") {
    await setReviewStatus(id, "approved");
    await audit("approve", { status: "approved" });
    return redirectTo(request, back, { ok: "approved" });
  }
  if (action === "reject") {
    await setReviewStatus(id, "rejected");
    await audit("reject", { status: "rejected" });
    return redirectTo(request, back, { ok: "rejected" });
  }
  if (action === "delete") {
    await deleteReview(id);
    await audit("delete");
    return redirectTo(request, back, { ok: "deleted" });
  }
  return redirectTo(request, back);
}

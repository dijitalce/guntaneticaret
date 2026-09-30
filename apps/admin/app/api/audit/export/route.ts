import { apiAdminSession, redirectTo } from "../../../../src/api-helpers";
import { actionLabel, entityLabel } from "../../../../src/audit-labels";
import { queryAudit } from "../../../../src/audit-query";

function csv(value: unknown) {
  const s = value == null ? "" : String(value);
  return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { rows } = await queryAudit(sp, 10_000, 0);
  const lines = [
    ["Zaman", "Kullanıcı", "İşlem", "Kayıt türü", "Kayıt no", "IP", "Önce", "Sonra"].join(";"),
    ...rows.map((r) =>
      [
        new Date(r.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
        r.actorEmail ?? "Sistem",
        actionLabel(r.action),
        entityLabel(r.entity),
        r.entityId,
        r.ip ?? "",
        r.before ? JSON.stringify(r.before) : "",
        r.after ? JSON.stringify(r.after) : "",
      ]
        .map(csv)
        .join(";"),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="islem-kayitlari-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

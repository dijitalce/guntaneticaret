import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auditLogs, db } from "@guntan/db";
import { actionLabel, actionTone, entityHref, entityLabel } from "@/src/audit-labels";
import { PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";

export const metadata = { title: "İşlem detayı" };

function flatten(value: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (value === null || value === undefined) return out;
  if (typeof value !== "object") {
    out[prefix || "değer"] = String(value);
    return out;
  }
  if (Array.isArray(value)) {
    out[prefix || "liste"] = value.length > 12 ? `${value.length} öğe` : JSON.stringify(value);
    return out;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = Array.isArray(v) ? (v.length > 12 ? `${v.length} öğe` : JSON.stringify(v)) : v === null ? "—" : String(v);
  }
  return out;
}

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
  if (!row) notFound();
  const before = flatten(row.before);
  const after = flatten(row.after);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const href = entityHref(row.entity, row.entityId);

  return (
    <>
      <PageHeader
        title={`${entityLabel(row.entity)} · ${actionLabel(row.action)}`}
        description={formatDate(row.createdAt)}
        crumbs={[{ href: "/system/audit", label: "İşlem kayıtları" }]}
        actions={<StatusBadge tone={actionTone(row.action)}>{actionLabel(row.action)}</StatusBadge>}
      />
      <div className="grid-2">
        <div>
          <Panel title="Değişiklikler" description="Önceki ve sonraki değerler karşılaştırması">
            {keys.length === 0 ? (
              <p className="muted text-sm panel-pad" style={{ margin: 0 }}>
                Bu işlemde değer kaydı yok.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="table diff-table">
                  <thead>
                    <tr>
                      <th>Alan</th>
                      <th>Önce</th>
                      <th>Sonra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => {
                      const changed = before[k] !== after[k];
                      return (
                        <tr key={k} className={changed ? "is-changed" : undefined}>
                          <td className="mono text-sm">{k}</td>
                          <td className="text-sm diff-before">{before[k] ?? "—"}</td>
                          <td className="text-sm diff-after">{after[k] ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title="Ham veri" padded>
            <pre className="log-view">{JSON.stringify({ before: row.before, after: row.after }, null, 2)}</pre>
          </Panel>
        </div>
        <div>
          <Panel title="Bilgi" padded>
            <dl className="dl">
              <div>
                <dt>Kullanıcı</dt>
                <dd>{row.actorId ? <Link href={`/system/users/${row.actorId}`}>{row.actorEmail ?? row.actorId}</Link> : row.actorEmail ?? "Sistem"}</dd>
              </div>
              <div>
                <dt>Kayıt</dt>
                <dd>
                  {entityLabel(row.entity)} · {href ? <Link href={href}>{row.entityId}</Link> : <span className="mono">{row.entityId}</span>}
                </dd>
              </div>
              <div>
                <dt>IP adresi</dt>
                <dd className="mono">{row.ip ?? "—"}</dd>
              </div>
              <div>
                <dt>Zaman</dt>
                <dd>{formatDate(row.createdAt)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

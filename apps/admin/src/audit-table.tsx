import Link from "next/link";
import { actionLabel, actionTone, entityHref, entityLabel } from "./audit-labels";
import { StatusBadge, formatDate } from "./ui";

export type AuditRow = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  entity: string;
  entityId: string;
  action: string;
  ip: string | null;
  createdAt: Date;
};

export function AuditTable({ rows, showActor = true }: { rows: AuditRow[]; showActor?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Zaman</th>
            {showActor ? <th>Kullanıcı</th> : null}
            <th>İşlem</th>
            <th>Kayıt</th>
            <th>IP</th>
            <th aria-label="Detay" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const href = entityHref(r.entity, r.entityId);
            return (
              <tr key={r.id}>
                <td className="text-sm" style={{ whiteSpace: "nowrap" }}>
                  {formatDate(r.createdAt)}
                </td>
                {showActor ? (
                  <td className="text-sm">
                    {r.actorId ? <Link href={`/system/users/${r.actorId}`}>{r.actorEmail ?? r.actorId}</Link> : r.actorEmail ?? "Sistem"}
                  </td>
                ) : null}
                <td>
                  <StatusBadge tone={actionTone(r.action)}>{actionLabel(r.action)}</StatusBadge>
                </td>
                <td className="text-sm">
                  <strong>{entityLabel(r.entity)}</strong>{" "}
                  {href ? (
                    <Link className="mono" href={href}>
                      {r.entityId.slice(0, 12)}
                    </Link>
                  ) : (
                    <span className="mono muted">{r.entityId.slice(0, 16)}</span>
                  )}
                </td>
                <td className="mono text-sm muted">{r.ip ?? "—"}</td>
                <td>
                  <Link className="btn btn-secondary btn-sm" href={`/system/audit/${r.id}`}>
                    Detay
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

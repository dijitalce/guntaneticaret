import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { ADMIN_ROLES, adminSessions, adminUsers, db, getAdminMeta, listAdminMeta } from "@guntan/db";
import { IconPlus } from "@/src/icons";
import { requireAdmin } from "@/src/shell";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Kullanıcılar" };
export const dynamic = "force-dynamic";

const OK: Record<string, string> = { silindi: "Kullanıcı silindi." };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  const [users, metas, me, sessions] = await Promise.all([
    db.select().from(adminUsers).orderBy(asc(adminUsers.name)),
    listAdminMeta(),
    getAdminMeta(session.user.id),
    db
      .select({ userId: adminSessions.adminUserId, c: sql<number>`count(*)` })
      .from(adminSessions)
      .where(sql`${adminSessions.expiresAt} > ${new Date().toISOString()}`)
      .groupBy(adminSessions.adminUserId),
  ]);
  const sessionCount = new Map(sessions.map((s) => [s.userId, Number(s.c)]));
  const canManage = ["owner", "admin"].includes(me.role);
  const roleLabel = (key: string) => ADMIN_ROLES.find((r) => r.key === key)?.label ?? key;
  const active = users.filter((u) => u.isActive === "true").length;

  return (
    <>
      <PageHeader
        title="Kullanıcılar"
        description="Panel hesapları, rolleri, son girişleri ve açık oturumları."
        actions={
          canManage ? (
            <Link className="btn btn-primary" href="/system/users/new">
              <IconPlus />
              Yeni kullanıcı
            </Link>
          ) : null
        }
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="kpis">
        <Kpi label="Toplam kullanıcı" value={users.length} />
        <Kpi label="Aktif" value={active} tone="ok" />
        <Kpi label="Pasif" value={users.length - active} />
        <Kpi label="Açık oturum" value={[...sessionCount.values()].reduce((a, b) => a + b, 0)} />
      </div>
      <Panel>
        {users.length === 0 ? (
          <EmptyState title="Kullanıcı yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Son giriş</th>
                  <th>Oturum</th>
                  <th>Eklenme</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const m = metas.get(u.id);
                  return (
                    <tr key={u.id} className="row-link" data-href={`/system/users/${u.id}`}>
                      <td>
                        <Link href={`/system/users/${u.id}`}>
                          <strong>{u.name}</strong>
                        </Link>
                        {u.id === session.user.id ? <span className="muted text-sm"> (siz)</span> : null}
                        <div className="muted text-sm">{u.email}</div>
                      </td>
                      <td>
                        <StatusBadge tone={m?.role === "owner" || !m ? "violet" : m.role === "admin" ? "info" : "neutral"}>
                          {roleLabel(m?.role ?? "admin")}
                        </StatusBadge>
                        {m?.title ? <div className="muted text-sm">{m.title}</div> : null}
                      </td>
                      <td>
                        <StatusBadge tone={u.isActive === "true" ? "ok" : "bad"}>{u.isActive === "true" ? "Aktif" : "Pasif"}</StatusBadge>
                      </td>
                      <td className="text-sm">
                        {m?.last_login_at ? (
                          <>
                            {relativeTime(m.last_login_at)}
                            <div className="muted mono">{m.last_login_ip ?? ""}</div>
                          </>
                        ) : (
                          <span className="muted">Kayıt yok</span>
                        )}
                      </td>
                      <td>{sessionCount.get(u.id) ?? 0}</td>
                      <td className="text-sm muted">{formatDate(u.createdAt, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

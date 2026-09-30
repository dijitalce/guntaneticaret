import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { ADMIN_ROLES, adminSessions, adminUsers, auditLogs, db, getAdminMeta } from "@guntan/db";
import { AuditTable } from "@/src/audit-table";
import { ConfirmButton } from "@/src/form-fields";
import { IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { requireAdmin } from "@/src/shell";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { StatRow, relativeTime } from "@/src/ui-ext";
import { UserForm } from "@/src/user-form";

export const metadata = { title: "Kullanıcı" };
export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  olusturuldu: "Kullanıcı oluşturuldu.",
  kaydedildi: "Değişiklikler kaydedildi.",
  sifre: "Şifre güncellendi. Kullanıcının açık oturumları kapatıldı.",
  oturumlar: "Tüm oturumlar kapatıldı.",
  aktif: "Kullanıcı aktif edildi.",
  pasif: "Kullanıcı pasif yapıldı ve oturumları kapatıldı.",
};

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await requireAdmin();
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!user) notFound();
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [meta, me, sessions, activity, aboutUser, counts] = await Promise.all([
    getAdminMeta(id),
    getAdminMeta(session.user.id),
    db.select().from(adminSessions).where(eq(adminSessions.adminUserId, id)).orderBy(desc(adminSessions.createdAt)).limit(20),
    db.select().from(auditLogs).where(eq(auditLogs.actorId, id)).orderBy(desc(auditLogs.createdAt)).limit(40),
    db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, "admin_user"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(15),
    db
      .select({
        total: sql<number>`count(*)`,
        month: sql<number>`sum(${auditLogs.createdAt} >= ${since30})`,
        logins: sql<number>`sum(${auditLogs.action} = 'login' and ${auditLogs.createdAt} >= ${since30})`,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.actorId, id), gte(auditLogs.createdAt, new Date(0)))),
  ]);
  const canManage = ["owner", "admin"].includes(me.role) && (meta.role !== "owner" || me.role === "owner");
  const isSelf = id === session.user.id;
  const now = new Date().toISOString();
  const openSessions = sessions.filter((s) => s.expiresAt > now);
  const action = withBase(`/api/users/${id}`);
  const roleLabel = ADMIN_ROLES.find((r) => r.key === meta.role)?.label ?? meta.role;
  const c = counts[0];

  return (
    <>
      <PageHeader
        title={user.name}
        description={`${user.email} · ${roleLabel}${meta.title ? ` · ${meta.title}` : ""}`}
        crumbs={[{ href: "/system/users", label: "Kullanıcılar" }]}
        actions={<StatusBadge tone={user.isActive === "true" ? "ok" : "bad"}>{user.isActive === "true" ? "Aktif" : "Pasif"}</StatusBadge>}
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {!canManage ? <Alert tone="info">Bu kullanıcıyı düzenlemek için yetkiniz yok; bilgiler salt okunur gösteriliyor.</Alert> : null}

      <Panel padded>
        <StatRow
          items={[
            { label: "Son giriş", value: meta.last_login_at ? relativeTime(meta.last_login_at) : "—", hint: meta.last_login_ip ?? undefined },
            { label: "Açık oturum", value: openSessions.length },
            { label: "Giriş (30 gün)", value: Number(c?.logins ?? 0) },
            { label: "İşlem (30 gün)", value: Number(c?.month ?? 0), hint: `Toplam ${Number(c?.total ?? 0)}` },
            { label: "Hesap oluşturma", value: formatDate(user.createdAt, false) },
          ]}
        />
      </Panel>

      <div className="grid-2">
        <div>
          <Panel title="Son işlemleri" description="Bu kullanıcının panelde yaptığı değişiklikler" action={
            <Link className="btn btn-secondary btn-sm" href={`/system/audit?kullanici=${id}`}>
              Tümünü gör
            </Link>
          }>
            {activity.length === 0 ? <EmptyState title="Henüz işlem kaydı yok" /> : <AuditTable rows={activity} showActor={false} />}
          </Panel>
          <Panel title="Hesap geçmişi" description="Bu hesap üzerinde yapılan değişiklikler">
            {aboutUser.length === 0 ? <EmptyState title="Kayıt yok" /> : <AuditTable rows={aboutUser} />}
          </Panel>
        </div>
        <div>
          <Panel title="Profil" padded>
            {canManage ? (
              <UserForm
                action={`/api/users/${id}`}
                canAssignOwner={me.role === "owner"}
                user={{ name: user.name, email: user.email, role: meta.role, phone: meta.phone, title: meta.title }}
              />
            ) : (
              <dl className="dl">
                <div>
                  <dt>Telefon</dt>
                  <dd>{meta.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt>Rol</dt>
                  <dd>{roleLabel}</dd>
                </div>
              </dl>
            )}
          </Panel>

          <Panel
            title="Oturumlar"
            description="Son 20 oturum"
            action={
              canManage && openSessions.length ? (
                <form action={action} method="post">
                  <input type="hidden" name="_action" value="revoke" />
                  <ConfirmButton className="btn btn-secondary btn-sm" message="Bu kullanıcının tüm oturumları kapatılsın mı?">
                    Tümünü kapat
                  </ConfirmButton>
                </form>
              ) : null
            }
          >
            {sessions.length === 0 ? (
              <EmptyState title="Oturum yok" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Açılış</th>
                      <th>Bitiş</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td className="text-sm">{formatDate(s.createdAt)}</td>
                        <td className="text-sm">{formatDate(s.expiresAt)}</td>
                        <td>
                          <StatusBadge tone={s.expiresAt > now ? "ok" : "neutral"}>{s.expiresAt > now ? "Açık" : "Süresi doldu"}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {canManage ? (
            <>
              <Panel title="Şifre sıfırla" padded>
                <form action={action} method="post" className="form-stack">
                  <input type="hidden" name="_action" value="password" />
                  <div className="field">
                    <label htmlFor="new-pass">Yeni şifre</label>
                    <input id="new-pass" className="input" type="password" name="password" minLength={10} required autoComplete="new-password" />
                    <small className="field-hint">En az 10 karakter. {isSelf ? "" : "Kullanıcının açık oturumları kapatılır."}</small>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                      Şifreyi güncelle
                    </button>
                  </div>
                </form>
              </Panel>
              {!isSelf ? (
                <Panel padded>
                  <form action={action} method="post" className="op-block">
                    <input type="hidden" name="_action" value="toggle" />
                    <div>
                      <strong>{user.isActive === "true" ? "Hesabı pasif yap" : "Hesabı aktif et"}</strong>
                      <small className="muted">
                        {user.isActive === "true" ? " Pasif kullanıcı giriş yapamaz, açık oturumları kapatılır." : " Kullanıcı tekrar giriş yapabilir."}
                      </small>
                    </div>
                    <ConfirmButton className="btn btn-secondary btn-sm" message="Emin misiniz?">
                      {user.isActive === "true" ? "Pasif yap" : "Aktif et"}
                    </ConfirmButton>
                  </form>
                  <form action={action} method="post" className="danger-zone">
                    <input type="hidden" name="_action" value="delete" />
                    <div>
                      <strong>Kullanıcıyı sil</strong>
                      <small>İşlem kayıtları silinmez; yalnızca hesap kaldırılır.</small>
                    </div>
                    <ConfirmButton className="btn btn-danger btn-sm" message={`“${user.name}” silinsin mi?`}>
                      <IconTrash />
                      Sil
                    </ConfirmButton>
                  </form>
                </Panel>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

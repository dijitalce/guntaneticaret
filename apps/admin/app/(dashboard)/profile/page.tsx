import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ADMIN_ROLES, adminSessions, auditLogs, db, getAdminMeta } from "@guntan/db";
import { AuditTable } from "@/src/audit-table";
import { ConfirmButton } from "@/src/form-fields";
import { withBase } from "@/src/paths";
import { requireAdmin } from "@/src/shell";
import { Alert, EmptyState, PageHeader, Panel } from "@/src/ui";
import { StatRow, relativeTime } from "@/src/ui-ext";
import { UserForm } from "@/src/user-form";

export const metadata = { title: "Profilim" };
export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  kaydedildi: "Profiliniz güncellendi.",
  sifre: "Şifreniz değiştirildi. Diğer cihazlardaki oturumlarınız kapatıldı.",
  oturumlar: "Diğer tüm oturumlar kapatıldı.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  const id = session.user.id;
  const [meta, sessions, activity] = await Promise.all([
    getAdminMeta(id),
    db.select().from(adminSessions).where(eq(adminSessions.adminUserId, id)),
    db.select().from(auditLogs).where(eq(auditLogs.actorId, id)).orderBy(desc(auditLogs.createdAt)).limit(25),
  ]);
  const now = new Date().toISOString();
  const open = sessions.filter((s) => s.expiresAt > now).length;
  const roleLabel = ADMIN_ROLES.find((r) => r.key === meta.role)?.label ?? meta.role;

  return (
    <>
      <PageHeader title="Profilim" description={`${session.user.email} · ${roleLabel}`} />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <StatRow
          items={[
            { label: "Rol", value: roleLabel },
            { label: "Son giriş", value: meta.last_login_at ? relativeTime(meta.last_login_at) : "—", hint: meta.last_login_ip ?? undefined },
            { label: "Açık oturum", value: open },
          ]}
        />
      </Panel>
      <div className="grid-2">
        <div>
          <Panel
            title="Son işlemlerim"
            action={
              <Link className="btn btn-secondary btn-sm" href={`/system/audit?kullanici=${id}`}>
                Tümünü gör
              </Link>
            }
          >
            {activity.length === 0 ? <EmptyState title="Henüz işlem kaydı yok" /> : <AuditTable rows={activity} showActor={false} />}
          </Panel>
        </div>
        <div>
          <Panel title="Bilgilerim" padded>
            <UserForm
              action="/api/profile"
              canAssignOwner={false}
              lockRole
              cancelHref="/"
              user={{ name: session.user.name, email: session.user.email, role: meta.role, phone: meta.phone, title: meta.title }}
            />
          </Panel>
          <Panel title="Şifre değiştir" padded>
            <form action={withBase("/api/profile")} method="post" className="form-stack">
              <input type="hidden" name="_action" value="password" />
              <div className="field">
                <label htmlFor="p-cur">Mevcut şifre</label>
                <input id="p-cur" className="input" type="password" name="current" required autoComplete="current-password" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="p-new">Yeni şifre</label>
                  <input id="p-new" className="input" type="password" name="password" minLength={10} required autoComplete="new-password" />
                </div>
                <div className="field">
                  <label htmlFor="p-new2">Yeni şifre (tekrar)</label>
                  <input id="p-new2" className="input" type="password" name="password2" minLength={10} required autoComplete="new-password" />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Şifreyi değiştir
                </button>
              </div>
            </form>
          </Panel>
          {open > 1 ? (
            <Panel padded>
              <form action={withBase("/api/profile")} method="post" className="op-block">
                <input type="hidden" name="_action" value="revoke_others" />
                <div>
                  <strong>Diğer oturumları kapat</strong>
                  <small className="muted"> Bu tarayıcı dışındaki {open - 1} oturum kapatılır.</small>
                </div>
                <ConfirmButton className="btn btn-secondary btn-sm" message="Diğer tüm oturumlar kapatılsın mı?">
                  Kapat
                </ConfirmButton>
              </form>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

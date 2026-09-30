import { getAdminMeta } from "@guntan/db";
import { requireAdmin } from "@/src/shell";
import { Alert, PageHeader, Panel } from "@/src/ui";
import { UserForm } from "@/src/user-form";

export const metadata = { title: "Yeni kullanıcı" };

export default async function NewUserPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  const me = await getAdminMeta(session.user.id);
  const canManage = ["owner", "admin"].includes(me.role);
  return (
    <>
      <PageHeader title="Yeni kullanıcı" description="Panele erişecek yeni bir hesap oluşturun." crumbs={[{ href: "/system/users", label: "Kullanıcılar" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {!canManage ? <Alert>Kullanıcı eklemek için Sahip veya Yönetici rolü gerekir.</Alert> : null}
      <div className="form-page">
        <Panel padded>
          <UserForm action="/api/users" canAssignOwner={me.role === "owner"} />
        </Panel>
      </div>
    </>
  );
}

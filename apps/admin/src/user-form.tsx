import Link from "next/link";
import { ADMIN_ROLES } from "@guntan/db";
import { withBase } from "./paths";

export function UserForm({
  user,
  canAssignOwner,
  action,
  cancelHref = "/system/users",
  lockRole = false,
}: {
  user?: { name: string; email: string; role: string; phone: string | null; title: string | null };
  canAssignOwner: boolean;
  action: string;
  cancelHref?: string;
  lockRole?: boolean;
}) {
  return (
    <form action={withBase(action)} method="post" className="form-stack">
      <input type="hidden" name="_action" value="save" />
      <div className="form-row">
        <div className="field">
          <label htmlFor="u-name">Ad soyad</label>
          <input id="u-name" className="input" name="name" required defaultValue={user?.name ?? ""} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="u-email">E-posta</label>
          <input id="u-email" className="input" type="email" name="email" required defaultValue={user?.email ?? ""} autoComplete="off" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="u-phone">Telefon</label>
          <input id="u-phone" className="input" name="phone" defaultValue={user?.phone ?? ""} placeholder="05xx xxx xx xx" />
        </div>
        <div className="field">
          <label htmlFor="u-title">Ünvan</label>
          <input id="u-title" className="input" name="title" defaultValue={user?.title ?? ""} placeholder="Örn. Operasyon sorumlusu" />
        </div>
      </div>
      {lockRole ? (
        <input type="hidden" name="role" value={user?.role ?? "support"} />
      ) : (
        <div className="field">
          <label>Rol</label>
          <div className="choice-grid">
            {ADMIN_ROLES.filter((r) => r.key !== "owner" || canAssignOwner || user?.role === "owner").map((r) => (
              <label key={r.key} className="choice">
                <input type="radio" name="role" value={r.key} defaultChecked={(user?.role ?? "support") === r.key} />
                <span>
                  <strong>{r.label}</strong>
                  <small>{r.description}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      {!user ? (
        <div className="field">
          <label htmlFor="u-pass">Şifre</label>
          <input id="u-pass" className="input" type="password" name="password" required minLength={10} autoComplete="new-password" />
          <small className="field-hint">En az 10 karakter. Kullanıcı giriş yaptıktan sonra Profilim sayfasından değiştirebilir.</small>
        </div>
      ) : null}
      <div className="form-actions">
        <Link className="btn btn-ghost" href={cancelHref}>
          Vazgeç
        </Link>
        <button className="btn btn-primary" type="submit">
          {user ? "Değişiklikleri kaydet" : "Kullanıcıyı oluştur"}
        </button>
      </div>
    </form>
  );
}

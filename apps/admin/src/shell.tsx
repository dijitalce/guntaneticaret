import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { AdminShellClient } from "./nav";

export async function requireAdmin() {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  if (!token) redirect("/login");
  const session = await getAdminBySession(token);
  if (!session) redirect("/login");
  return session;
}

/** Senkron sarmalayıcı — sayfalar session’ı bir kez alıp children verir. */
export function AdminShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}) {
  return (
    <AdminShellClient userName={userName} userEmail={userEmail}>
      {children}
    </AdminShellClient>
  );
}

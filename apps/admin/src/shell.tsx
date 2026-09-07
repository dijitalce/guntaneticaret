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

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShellClient userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AdminShellClient>
  );
}

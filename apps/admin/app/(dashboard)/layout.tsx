import { requireAdmin, AdminShell } from "@/src/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AdminShell>
  );
}

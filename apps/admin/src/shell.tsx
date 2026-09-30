import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { count, inArray } from "drizzle-orm";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { db, orders } from "@guntan/db";
import { AdminShellClient } from "./nav";

export async function requireAdmin() {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  if (!token) redirect("/login");
  const session = await getAdminBySession(token);
  if (!session) redirect("/login");
  return session;
}

/** Menüdeki rozet: ödeme bekleyen, hazırlanacak veya kargolanacak siparişler. */
async function actionableOrderCount() {
  try {
    const [row] = await db
      .select({ n: count() })
      .from(orders)
      .where(inArray(orders.status, ["pending_payment", "paid", "preparing"]));
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

export async function AdminShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}) {
  const storefrontUrl = process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com";
  const orderCount = await actionableOrderCount();
  return (
    <AdminShellClient
      userName={userName}
      userEmail={userEmail}
      storefrontUrl={storefrontUrl}
      counts={{ orders: orderCount }}
    >
      {children}
    </AdminShellClient>
  );
}

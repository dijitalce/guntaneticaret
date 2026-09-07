import { withBase } from "@/src/paths";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto" }}>
      <h1>Admin giriş</h1>
      {sp.hata === "1" && (
        <p style={{ color: "#b91c1c", marginBottom: "0.75rem" }} role="alert">
          E-posta veya şifre hatalı. Canlıda admin yoksa bir kez ensure-admin çalıştırın.
        </p>
      )}
      <form action={withBase("/api/login")} method="post" className="card" style={{ padding: "1rem", display: "grid", gap: "0.5rem" }}>
        <input className="input" name="email" type="email" defaultValue="admin@guntan.local" required />
        <input className="input" name="password" type="password" placeholder="Şifre" required />
        <button className="btn btn-primary" type="submit">Giriş</button>
      </form>
    </main>
  );
}

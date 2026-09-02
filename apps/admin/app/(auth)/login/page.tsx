export default function LoginPage() {
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto" }}>
      <h1>Admin giriş</h1>
      <form action="/api/login" method="post" className="card" style={{ padding: "1rem", display: "grid", gap: "0.5rem" }}>
        <input className="input" name="email" type="email" defaultValue="admin@guntan.local" required />
        <input className="input" name="password" type="password" placeholder="Şifre" required />
        <button className="btn btn-primary" type="submit">Giriş</button>
      </form>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "#f6f6f4",
        color: "#111",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Site henüz hazır değil</h1>
        <p style={{ lineHeight: 1.55, color: "#444", marginBottom: "1rem" }}>
          Bu domain için veritabanında tenant kaydı bulunamadı. Hostinger MySQL’de şema ve seed
          çalıştırılmamış olabilir veya <code>DATABASE_URL</code> hâlâ Postgres.
        </p>
        <ol style={{ lineHeight: 1.7, color: "#333", paddingLeft: "1.25rem" }}>
          <li>
            <code>DATABASE_URL=mysql://...@localhost:3306/...</code>
          </li>
          <li>
            <code>pnpm db:migrate</code>
          </li>
          <li>
            <code>pnpm db:seed</code>
          </li>
          <li>
            <code>pnpm db:sync-tenants</code>
          </li>
        </ol>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/" style={{ color: "#0b57d0" }}>
            Anasayfayı yenile
          </Link>
        </p>
      </div>
    </main>
  );
}

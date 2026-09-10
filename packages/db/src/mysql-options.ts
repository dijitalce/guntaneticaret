import type { PoolOptions } from "mysql2/promise";

export function mysqlConnectOptions(url: string, overrides: { connectionLimit?: number } = {}): PoolOptions {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL geçersiz. Örnek: mysql://user:pass@localhost:3306/dbname");
  }

  if (!/^mysql(s)?:$/i.test(parsed.protocol)) {
    throw new Error(
      `DATABASE_URL MySQL olmalı (mysql://...), alınan protokol: ${parsed.protocol}. Eski postgres/supabase URL'ini kaldır.`,
    );
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(parsed.hostname);
  // Hostinger shared MySQL usually has no client SSL. Opt in with DATABASE_SSL=1.
  const wantSsl = process.env.DATABASE_SSL === "1" || parsed.searchParams.get("ssl") === "true";

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "").replace(/\?.*$/, ""),
    // Hostinger shared MySQL process/connection caps — keep the pool tiny.
    connectionLimit: overrides.connectionLimit ?? (isLocal ? 10 : 5),
    waitForConnections: true,
    enableKeepAlive: true,
    ssl: wantSsl ? { rejectUnauthorized: false } : undefined,
    timezone: "Z",
    dateStrings: false,
  };
}

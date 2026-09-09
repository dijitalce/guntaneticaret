export function pgConnectOptions(url: string, overrides: { max?: number } = {}) {
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  // Supabase transaction pooler (pgbouncer) — not RDS or direct :5432.
  const isPooler = /:6543(?:\/|$|\?)/.test(url) || /pooler\./i.test(url);
  return {
    max: overrides.max ?? (isLocal ? 10 : 5),
    ssl: isLocal ? undefined : ("require" as const),
    // Pooler can't keep prepared statements across multiplexed connections.
    // RDS and Supabase direct Postgres can.
    prepare: isLocal || !isPooler,
    idle_timeout: isPooler ? 20 : isLocal ? undefined : 30,
    max_lifetime: isPooler ? 60 * 30 : isLocal ? undefined : 60 * 60,
  };
}

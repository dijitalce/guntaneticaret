export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // postgres.js has a known class of bugs where a connection killed
  // server-side (e.g. by Supabase's pgbouncer transaction pooler closing an
  // idle connection) can throw on the next write in a way that bypasses the
  // query's own promise rejection (try/catch around the query does not catch
  // it) — see https://github.com/porsager/postgres/issues/1208 and #1133.
  // Node's default behavior for an uncaughtException is to crash the whole
  // process, which here means every tenant/domain served by this instance
  // goes down together and the host has to restart it from scratch.
  //
  // We keep our own idle/lifetime timeouts in packages/db/src/client.ts to
  // avoid triggering this in the first place, but this handler is a last
  // resort: log the error and keep serving other requests instead of taking
  // down the whole multi-tenant server for a single bad connection.
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] keeping process alive:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection] keeping process alive:", reason);
  });
}

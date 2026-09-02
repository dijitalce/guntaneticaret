export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // See apps/storefront/instrumentation.ts for the full explanation: postgres.js
  // can throw an uncatchable exception when pgbouncer kills an idle connection
  // out from under it, which would otherwise crash this whole process.
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] keeping process alive:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection] keeping process alive:", reason);
  });
}

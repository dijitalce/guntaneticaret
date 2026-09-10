export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Last resort: keep the multi-tenant Node process alive if a single DB
  // connection or async task throws outside a try/catch (shared Hostinger
  // connection limits / idle disconnects). Prefer failing one request over
  // taking down every tenant domain on this instance.
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] keeping process alive:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection] keeping process alive:", reason);
  });
}

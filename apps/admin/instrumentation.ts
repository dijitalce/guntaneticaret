export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // See apps/storefront/instrumentation.ts — keep process alive on stray
  // connection/async errors under Hostinger shared limits.
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] keeping process alive:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection] keeping process alive:", reason);
  });

  // Otomasyonlar (terk edilmiş sepet, havale hatırlatma/iptal, stok bildirimleri, kampanya kuyruğu).
  const { startAutomationScheduler } = await import("@guntan/db");
  startAutomationScheduler();
}

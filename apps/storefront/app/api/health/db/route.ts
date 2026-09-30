import { NextResponse } from "next/server";
import { pool } from "@guntan/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, db: "ok", ms: Date.now() - started });
  } catch (err) {
    const e = err as { code?: string; errno?: number; message?: string };
    return NextResponse.json(
      { ok: false, db: "error", code: e.code ?? null, errno: e.errno ?? null, message: e.message ?? String(err), ms: Date.now() - started },
      { status: 503 },
    );
  }
}

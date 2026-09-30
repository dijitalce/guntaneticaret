import type { SQL } from "drizzle-orm";
import { db } from "../client";

export async function rows<T>(query: SQL): Promise<T[]> {
  const [result] = (await db.execute(query)) as unknown as [T[]];
  return Array.isArray(result) ? result : [];
}

export async function first<T>(query: SQL): Promise<T | null> {
  return (await rows<T>(query))[0] ?? null;
}

export async function exec(query: SQL): Promise<{ affectedRows: number; insertId: number }> {
  const [result] = (await db.execute(query)) as unknown as [{ affectedRows?: number; insertId?: number }];
  return { affectedRows: Number(result?.affectedRows ?? 0), insertId: Number(result?.insertId ?? 0) };
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

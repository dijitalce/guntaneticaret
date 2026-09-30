import { sql } from "drizzle-orm";
import { db } from "./client";

// Sunucuda migration elle çalıştırıldığı için tablo ilk erişimde oluşturulur.
let ensured: Promise<void> | null = null;

export function ensureAppSettingsTable(): Promise<void> {
  ensured ??= db
    .execute(
      sql`create table if not exists app_settings (
        setting_key varchar(64) not null primary key,
        setting_value longtext not null,
        updated_at timestamp not null default current_timestamp on update current_timestamp
      )`,
    )
    .then(() => undefined)
    .catch((err) => {
      ensured = null;
      throw err;
    });
  return ensured;
}

export async function getAppSetting<T>(key: string): Promise<{ value: T; updatedAt: Date } | null> {
  await ensureAppSettingsTable();
  const [rows] = (await db.execute(
    sql`select setting_value, updated_at from app_settings where setting_key = ${key} limit 1`,
  )) as unknown as [{ setting_value: string; updated_at: Date | string }[]];
  const row = rows[0];
  if (!row) return null;
  try {
    return { value: JSON.parse(row.setting_value) as T, updatedAt: new Date(row.updated_at) };
  } catch {
    return null;
  }
}

export async function setAppSetting(key: string, value: unknown): Promise<void> {
  await ensureAppSettingsTable();
  const json = JSON.stringify(value);
  await db.execute(
    sql`insert into app_settings (setting_key, setting_value) values (${key}, ${json})
        on duplicate key update setting_value = values(setting_value)`,
  );
}

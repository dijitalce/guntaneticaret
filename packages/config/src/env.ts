import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  MEILI_HOST: z.string().url(),
  MEILI_MASTER_KEY: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET: z.string().min(1),
  S3_PUBLIC_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  ADMIN_COOKIE_DOMAIN: z.string().default("localhost"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().email(),
  SENTRY_DSN: z.string().optional().default(""),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DEFAULT_TENANT_SLUG: z.string().default("guntan"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

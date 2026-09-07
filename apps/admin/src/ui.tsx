import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  padded = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="panel">
      {title ? (
        <div className="panel-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={padded ? "panel-pad" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "ok" | "warn" | "bad" | "info" | "neutral";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function statusTone(status: string): "ok" | "warn" | "bad" | "info" | "neutral" {
  const s = status.toLowerCase();
  if (["active", "completed", "success", "paid", "confirmed"].some((x) => s.includes(x))) return "ok";
  if (["pending", "running", "processing", "draft"].some((x) => s.includes(x))) return "warn";
  if (["failed", "error", "cancel", "inactive", "out"].some((x) => s.includes(x))) return "bad";
  if (["maintenance"].some((x) => s.includes(x))) return "info";
  return "neutral";
}

export function formatTry(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

export function QuickLink({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link className="quick-link" href={href}>
      <strong>{title}</strong>
      <span>{hint}</span>
    </Link>
  );
}

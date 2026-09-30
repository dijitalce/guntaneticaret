import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { IconAlert, IconCheckCircle, IconChevronRight, IconInbox } from "./icons";

export type Tone = "ok" | "warn" | "bad" | "info" | "violet" | "neutral";

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <header className="page-head">
      <div>
        {crumbs?.length ? (
          <nav className="page-crumbs" aria-label="Konum">
            {crumbs.map((c) => (
              <span key={c.href} style={{ display: "contents" }}>
                <Link href={c.href}>{c.label}</Link>
                <IconChevronRight width={12} height={12} />
              </span>
            ))}
            <span>{title}</span>
          </nav>
        ) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  padded = false,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="panel">
      {title ? (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={padded ? "panel-pad" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = IconInbox,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="empty">
      <div className="empty-ico">
        <Icon />
      </div>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function Alert({ tone = "bad", children }: { tone?: "ok" | "bad" | "info" | "warn"; children: ReactNode }) {
  const Icon = tone === "ok" ? IconCheckCircle : IconAlert;
  return (
    <div className={`alert${tone === "bad" ? "" : ` alert-${tone}`}`} role={tone === "bad" ? "alert" : "status"}>
      <Icon />
      <div>{children}</div>
    </div>
  );
}

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "pending_payment") return "warn";
  if (s === "paid") return "info";
  if (s === "preparing") return "violet";
  if (s === "shipped") return "info";
  if (["active", "completed", "success", "confirmed", "delivered", "in_stock"].some((x) => s.includes(x))) return "ok";
  if (["pending", "running", "processing", "draft", "awaiting"].some((x) => s.includes(x))) return "warn";
  if (["failed", "error", "cancel", "inactive", "out", "refund"].some((x) => s.includes(x))) return "bad";
  if (["maintenance"].some((x) => s.includes(x))) return "info";
  return "neutral";
}

export function formatTry(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

export function formatDate(d: Date | string | null | undefined, withTime = true) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Istanbul",
  });
}

export function QuickLink({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link className="quick-link" href={href}>
      <strong>{title}</strong>
      <span>{hint}</span>
    </Link>
  );
}

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: "brand" | "ok" | "warn" | "info" | "violet";
  href?: string;
}) {
  const body = (
    <>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {Icon ? (
          <span className={`kpi-ico${tone ? ` is-${tone}` : ""}`}>
            <Icon />
          </span>
        ) : null}
      </div>
      <strong>{value}</strong>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </>
  );
  return href ? (
    <Link className="kpi" href={href}>
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}

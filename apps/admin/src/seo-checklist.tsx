import Link from "next/link";
import { IconAlert, IconCheck } from "./icons";
import type { SeoCheck } from "./tenant-seo";

export function ScoreRing({ score, tone, size = 64 }: { score: number; tone: "ok" | "warn" | "bad"; size?: number }) {
  return (
    <span
      className={`score-ring is-${tone}`}
      style={{ width: size, height: size, ["--p" as string]: `${score}` }}
      role="img"
      aria-label={`SEO puanı ${score}/100`}
    >
      <b>{score}</b>
    </span>
  );
}

export function SeoChecklist({ checks, hrefFor }: { checks: SeoCheck[]; hrefFor?: (tab: string) => string }) {
  const sorted = [...checks].sort((a, b) => Number(a.ok) - Number(b.ok) || b.weight - a.weight);
  return (
    <ul className="seo-checks">
      {sorted.map((c) => (
        <li key={c.key} className={c.ok ? "is-ok" : "is-todo"}>
          <span className="seo-check-ico" aria-hidden>
            {c.ok ? <IconCheck /> : <IconAlert />}
          </span>
          <div>
            {!c.ok && hrefFor ? <Link href={hrefFor(c.tab)}>{c.label}</Link> : <strong>{c.label}</strong>}
            {!c.ok ? <small>{c.hint}</small> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

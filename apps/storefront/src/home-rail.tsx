"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function HomeRail({
  id,
  eyebrow,
  title,
  lead,
  action,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const go = (dir: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" });
  };

  const scrollable = !(edge.start && edge.end);
  return (
    <section className={`home-rail${className ? ` ${className}` : ""}`} aria-labelledby={id}>
      <div className="rail-head">
        <div>
          <span className="rail-eyebrow">{eyebrow}</span>
          <h2 id={id}>{title}</h2>
          {lead ? <p>{lead}</p> : null}
        </div>
        <div className="rail-controls">
          {action}
          {scrollable ? (
            <>
              <button type="button" className="rail-arrow" onClick={() => go(-1)} disabled={edge.start} aria-label="Önceki">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button type="button" className="rail-arrow" onClick={() => go(1)} disabled={edge.end} aria-label="Sonraki">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          ) : null}
        </div>
      </div>
      <ul ref={track} className="rail-track">
        {children}
      </ul>
    </section>
  );
}

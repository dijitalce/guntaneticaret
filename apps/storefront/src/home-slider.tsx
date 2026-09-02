"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Slide = {
  alt: string;
  href: string;
  image: string;
};

export function HomeSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((dir: number) => {
    setI((cur) => (cur + dir + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [go, paused]);

  const slide = slides[i]!;
  return (
    <section
      className="home-slider"
      aria-roledescription="carousel"
      aria-label="Kampanyalar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link className="home-slide" href={slide.href} key={slide.image}>
        <img src={slide.image} alt={slide.alt} />
      </Link>
      <div className="home-slider-nav">
        <button type="button" className="home-slider-arrow" onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(-1); }} aria-label="Önceki slayt">‹</button>
        <div className="home-slider-dots">
          {slides.map((s, idx) => (
            <button
              key={s.image}
              type="button"
              className={idx === i ? "is-active" : undefined}
              aria-label={`Slayt ${idx + 1}`}
              aria-current={idx === i || undefined}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setI(idx); }}
            />
          ))}
        </div>
        <button type="button" className="home-slider-arrow" onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(1); }} aria-label="Sonraki slayt">›</button>
      </div>
    </section>
  );
}

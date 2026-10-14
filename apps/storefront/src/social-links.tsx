import type { CSSProperties, ReactNode } from "react";
import { SOCIAL_LINKS, announcementFromSocial } from "@guntan/types";

type SocialKey = (typeof SOCIAL_LINKS)[number]["key"];

const ICONS: Record<SocialKey, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3Z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3a7 7 0 0 1-3.9-1.2v6.1A5.7 5.7 0 1 1 11 9v3.1a2.6 2.6 0 1 0 2.5 2.6V3h3.1Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.9 8.8H3.6V20h3.3V8.8ZM5.2 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.6c0-3-1.6-5-4.3-5-1.4 0-2.4.8-2.8 1.5V8.8h-3.2V20h3.3v-5.6c0-1.5.3-2.8 2-2.8s1.7 1.6 1.7 2.9V20h3.3v-6.4Z" />
    </svg>
  ),
  sahibinden: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#ffe800" />
      <path
        d="M15.4 8.6c-.7-.9-1.9-1.4-3.3-1.4-2 0-3.4 1.1-3.4 2.7 0 1.7 1.3 2.3 3.1 2.7 1.3.3 1.8.6 1.8 1.2 0 .6-.6 1-1.6 1-1.1 0-2-.5-2.6-1.3l-1.3 1.3c.8 1.1 2.2 1.8 3.8 1.8 2.2 0 3.7-1.1 3.7-2.9 0-1.6-1.1-2.3-3.1-2.7-1.3-.3-1.8-.5-1.8-1.1 0-.5.5-.9 1.3-.9.9 0 1.6.4 2.1 1l1.3-1.4Z"
        fill="#1b1b1b"
      />
    </svg>
  ),
};

export function SocialGlyph({ name }: { name: SocialKey }) {
  return <span className={`social-glyph is-${name}`}>{ICONS[name]}</span>;
}

export type SocialLink = { key: SocialKey; label: string; href: string };

export function socialLinks(social: Record<string, string> | null | undefined): SocialLink[] {
  return SOCIAL_LINKS.flatMap((l) => {
    const href = social?.[l.key];
    return href && /^https?:\/\//i.test(href) ? [{ key: l.key, label: l.label, href }] : [];
  });
}

export function SocialIcons({ links, className }: { links: SocialLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <ul className={`social-icons${className ? ` ${className}` : ""}`}>
      {links.map((l) => (
        <li key={l.key}>
          <a href={l.href} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label} className={`is-${l.key}`}>
            {ICONS[l.key]}
          </a>
        </li>
      ))}
    </ul>
  );
}

const MIN_LOOP_CHARS = 220;
const SECONDS_PER_CHAR = 0.16;

export function AnnouncementBar({ social }: { social: Record<string, string> | null | undefined }) {
  const { messages, bg, fg } = announcementFromSocial(social);
  if (!messages.length) return null;
  const links = socialLinks(social);
  const chars = messages.join("").length + messages.length * 8;
  const repeat = Math.max(1, Math.ceil(MIN_LOOP_CHARS / chars));
  const loop = Array.from({ length: repeat }, () => messages).flat();
  const style = {
    "--announce-bg": bg,
    "--announce-fg": fg,
    "--announce-duration": `${Math.round(loop.join("").length * SECONDS_PER_CHAR + 8)}s`,
  } as CSSProperties;

  return (
    <div className="announce-bar" style={style}>
      <div className="container announce-inner">
        <SocialIcons links={links} className="announce-social" />
        <div className="announce-marquee" role="region" aria-label="Duyurular">
          <ul className="sr-only">
            {messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          <div className="announce-track" aria-hidden>
            {[0, 1].map((copy) => (
              <ul key={copy} className="announce-list">
                {loop.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

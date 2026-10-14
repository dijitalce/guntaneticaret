import type { ReactNode } from "react";

type PartKind = {
  match: RegExp;
  hint: string;
  icon: ReactNode;
};

const BEARING_BALLS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { cx: +(12 + 6.5 * Math.cos(rad)).toFixed(2), cy: +(12 + 6.5 * Math.sin(rad)).toFixed(2) };
});

const WRENCH = (
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
);

/** Kök kategori adları ASCII'ye katlanarak eşleşir; sıra önemli (ilk eşleşen kazanır). */
const KINDS: PartKind[] = [
  {
    match: /fren|balata/,
    hint: "Balata · disk · kaliper · hortum",
    icon: (
      <>
        <circle cx="11" cy="13" r="8" />
        <circle cx="11" cy="13" r="2.4" />
        <path d="M11 7.2v.01M16.2 13h.01M11 18.8v.01M5.8 13h.01" />
        <path d="M14.6 3.2a10 10 0 0 1 5.8 6.1l-3 1.1a6.8 6.8 0 0 0-3.9-4.2z" />
      </>
    ),
  },
  {
    match: /alt takim|suspansiyon|amortisor/,
    hint: "Amortisör · rotil · salıncak",
    icon: (
      <>
        <path d="M12 2v4M12 18v4" />
        <rect x="9.5" y="6" width="5" height="3" rx="1" />
        <path d="M8 10.5l8 1.5-8 1.5 8 1.5-8 1.5" />
        <path d="M9 18h6" />
      </>
    ),
  },
  {
    match: /atesleme|buji/,
    hint: "Buji · bobin · ateşleme kablosu",
    icon: (
      <>
        <path d="M10 2h4v3h-4zM8.5 5h7v4h-7zM10 9h4v6h-4zM12 15v3.5" />
        <path d="M10 18.5h4M17 17l2-1M17 20l2 1M7 17l-2-1M7 20l-2 1" />
      </>
    ),
  },
  {
    match: /elektrik|aku|sensor/,
    hint: "Marş · şarj dinamosu · sensör",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M6.5 7V4.5h3V7M14.5 7V4.5h3V7M6.5 13.5h4M15 11.5v4M13 13.5h4" />
      </>
    ),
  },
  {
    match: /kaporta|tampon|ayna/,
    hint: "Tampon · çamurluk · ayna · panjur",
    icon: (
      <>
        <path d="M3 16.5v-3.2l2.2-1.1 3.2-4.2h7.2l4 4.1 1.4.9v3.5h-1.6" />
        <path d="M9 16.5h6M8 12.2h11.2" />
        <circle cx="7" cy="16.5" r="2" />
        <circle cx="17" cy="16.5" r="2" />
      </>
    ),
  },
  {
    match: /motor|piston|conta/,
    hint: "Conta · piston · yatak · subap",
    icon: (
      <>
        <rect x="6.5" y="2.5" width="11" height="8" rx="1.5" />
        <path d="M6.5 5.2h11M6.5 7.8h11M10 10.5l-1 6M14 10.5l1 6" />
        <circle cx="12" cy="18.5" r="2.8" />
      </>
    ),
  },
  {
    match: /kaucuk|takoz|koruk|burc/,
    hint: "Takoz · körük · burç",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.8" />
      </>
    ),
  },
  {
    match: /filtre/,
    hint: "Yağ · hava · polen · yakıt filtresi",
    icon: (
      <>
        <path d="M8 2.5h8v3H8z" />
        <path d="M6 5.5h12v13.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
        <path d="M9 9.5v8M12 9.5v8M15 9.5v8" />
      </>
    ),
  },
  {
    match: /sogutma|radyator|termostat/,
    hint: "Radyatör · termostat · su pompası",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
        <path d="M7.5 8v8M10.5 8v8M13.5 8v8M16.5 8v8M20.5 8.5h1.8M1.7 15.5h1.8" />
      </>
    ),
  },
  {
    match: /rulman/,
    hint: "Teker · debriyaj · porya rulmanı",
    icon: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <circle cx="12" cy="12" r="3.6" />
        {BEARING_BALLS.map((b) => <circle key={`${b.cx}-${b.cy}`} cx={b.cx} cy={b.cy} r="1.25" />)}
      </>
    ),
  },
  {
    match: /aydinlatma|\bfar\b|stop|lamba/,
    hint: "Far · stop · sis lambası · ampul",
    icon: (
      <>
        <path d="M11 5C6.5 5 4 8 4 12s2.5 7 7 7h1.5V5z" />
        <path d="M15.5 8H21M15.5 12H21M15.5 16H21" />
      </>
    ),
  },
  {
    match: /kayis|triger/,
    hint: "Triger · V kayışı · gergi rulmanı",
    icon: (
      <>
        <circle cx="7" cy="15.5" r="4.5" />
        <circle cx="17.5" cy="7.5" r="3" />
        <circle cx="7" cy="15.5" r="1.2" />
        <circle cx="17.5" cy="7.5" r="0.9" />
        <path d="M4.3 11.9l11.4-6.8M9.6 19.2l10.3-9.9" />
      </>
    ),
  },
  {
    match: /tel aksam|teli|kablo/,
    hint: "Gaz · debriyaj · el freni teli",
    icon: (
      <>
        <path d="M4 19.5c4.5 0 4-6.5 8-6.5s3.5-8 8-8" />
        <circle cx="4" cy="19.5" r="1.6" />
        <path d="M18.5 3.5l3 3" />
      </>
    ),
  },
  {
    match: /sanzuman|vites|debriyaj|\baks\b/,
    hint: "Debriyaj seti · vites · aks",
    icon: (
      <>
        <circle cx="6" cy="5" r="1.7" />
        <circle cx="12" cy="5" r="1.7" />
        <circle cx="18" cy="5" r="1.7" />
        <circle cx="6" cy="19" r="1.7" />
        <circle cx="12" cy="19" r="1.7" />
        <path d="M6 6.7v10.6M12 6.7v10.6M18 6.7V12H6" />
      </>
    ),
  },
  {
    match: /direksiyon|\brot\b/,
    hint: "Direksiyon kutusu · rot · pompa",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M3.4 10.6l6-.6M14.6 10l6 .6M12 14.6V21" />
      </>
    ),
  },
  {
    match: /kimyasal|yag|antifriz/,
    hint: "Motor yağı · antifriz · bakım spreyi",
    icon: (
      <>
        <path d="M9 2.5h4v3H9z" />
        <path d="M8 5.5h6l2.5 3.5v10a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2V9z" />
        <path d="M5.5 12.5h11" />
      </>
    ),
  },
  {
    match: /aksesuar/,
    hint: "Paspas · kılıf · araç bakım",
    icon: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  },
];

function fold(name: string): string {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

export function partKind(categoryName: string): { hint: string; icon: ReactNode } {
  const key = fold(categoryName);
  const kind = KINDS.find((k) => k.match.test(key));
  return kind ? { hint: kind.hint, icon: kind.icon } : { hint: "Bu gruptaki tüm yedek parçalar", icon: WRENCH };
}

export function PartIcon({ icon }: { icon: ReactNode }) {
  return (
    <svg className="part-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icon}
    </svg>
  );
}

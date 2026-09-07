import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Güntan Admin",
    template: "%s · Güntan Admin",
  },
};

const font = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-admin",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`admin-body ${font.variable} ${font.className}`}>{children}</body>
    </html>
  );
}

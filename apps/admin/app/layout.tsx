import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Güntan Admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

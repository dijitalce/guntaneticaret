import { eq } from "drizzle-orm";
import { db, manufacturers } from "@guntan/db";

const DATA_URI = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db.select({ logoUrl: manufacturers.logoUrl }).from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
  const match = row?.logoUrl?.match(DATA_URI);
  if (!match) return new Response("Bulunamadı", { status: 404 });
  return new Response(Buffer.from(match[2]!, "base64"), {
    headers: {
      "Content-Type": match[1]!,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVG doğrudan açılırsa içindeki betikler çalışmasın.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}

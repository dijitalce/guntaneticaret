import { NextResponse } from "next/server";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, slugify, text } from "../../../../../src/api-helpers";
import { BLOG_IMAGE_MAX_BYTES, saveBlogImage, vehicleImageType } from "../../../../../src/vehicle-images";

/** Blog editörü ve kapak alanı için görsel yükleme; JSON { url } döner. */
export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Görsel seçilmedi." }, { status: 400 });
  if (file.size > BLOG_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: `Görsel en fazla ${BLOG_IMAGE_MAX_BYTES / 1024 / 1024} MB olabilir.` }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = vehicleImageType(bytes);
  if (!type) return NextResponse.json({ error: "Yalnızca WEBP, JPG veya PNG yükleyebilirsiniz." }, { status: 400 });
  const base = slugify(text(form, "name") || file.name.replace(/\.[a-z0-9]+$/i, ""));
  try {
    const url = await saveBlogImage(base, bytes, type);
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "blog_image", entityId: url.slice(-64), action: "create", after: { url, bytes: bytes.length, type } });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

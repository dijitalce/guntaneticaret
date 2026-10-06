"use client";

import { useRef, useState } from "react";
import { withBase } from "./paths";

const MAX_W = 800;
const MAX_H = 500;

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bitmap.width, MAX_H / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.88);
  if (!blob) throw new Error("Fotoğraf işlenemedi.");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `arac.${ext}`, { type: blob.type });
}

export function VehicleImageForm({
  entity,
  id,
  imageUrl,
  assetBase,
  next,
  label,
  compact = false,
}: {
  entity: "model" | "generation";
  id: string;
  imageUrl: string | null;
  assetBase: string;
  next: string;
  label: string;
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = withBase("/api/vehicle-images");
  const src = imageUrl ? (/^(https?:|data:)/.test(imageUrl) ? imageUrl : `${assetBase}${imageUrl}`) : null;

  return (
    <div className={`vehicle-image${compact ? " is-compact" : ""}`}>
      <div className="vehicle-image-preview">
        {src ? <img src={src} alt="" /> : <span>Fotoğraf yok</span>}
      </div>
      <div className="vehicle-image-actions">
        <form ref={formRef} action={action} method="post" encType="multipart/form-data">
          <input type="hidden" name="_action" value="upload" />
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="next" value={next} />
          <input ref={fileRef} type="file" name="file" hidden tabIndex={-1} />
          <label className={`btn btn-secondary btn-xs${busy ? " is-loading" : ""}`}>
            {busy ? "Yükleniyor…" : src ? "Değiştir" : "Fotoğraf yükle"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              aria-label={`${label} fotoğrafı yükle`}
              disabled={busy}
              onChange={async (e) => {
                const picked = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (!picked) return;
                setError("");
                setBusy(true);
                try {
                  const file = await shrink(picked);
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileRef.current!.files = dt.files;
                  formRef.current?.requestSubmit();
                } catch (err) {
                  setBusy(false);
                  setError((err as Error).message || "Fotoğraf işlenemedi.");
                }
              }}
            />
          </label>
        </form>
        {src ? (
          <form action={action} method="post">
            <input type="hidden" name="_action" value="remove" />
            <input type="hidden" name="entity" value={entity} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="next" value={next} />
            <button className="btn btn-ghost btn-xs" type="submit">
              Kaldır
            </button>
          </form>
        ) : null}
        {!compact ? <small className="field-hint">Yan profil, mümkünse şeffaf veya beyaz arka planlı fotoğraf. Otomatik olarak küçültülür.</small> : null}
        {error ? <small className="mfr-error">{error}</small> : null}
      </div>
    </div>
  );
}

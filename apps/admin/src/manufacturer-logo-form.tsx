"use client";

import { useRef, useState } from "react";
import { MANUFACTURER_LOGO_MAX_BYTES } from "@guntan/config/manufacturer-logos";
import { withBase } from "./paths";

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export function ManufacturerLogoForm({ id, name, next, hasCustom }: { id: string; name: string; next: string; hasCustom: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const action = withBase(`/api/manufacturers/${id}`);

  return (
    <div className="mfr-actions">
      <form ref={formRef} action={action} method="post" encType="multipart/form-data">
        <input type="hidden" name="_action" value="upload" />
        <input type="hidden" name="next" value={next} />
        <label className={`btn btn-secondary btn-xs${busy ? " is-loading" : ""}`}>
          {busy ? "Yükleniyor…" : hasCustom ? "Değiştir" : "Logo yükle"}
          <input
            type="file"
            name="logo"
            accept={ACCEPT}
            hidden
            aria-label={`${name} logosu yükle`}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              if (file.size > MANUFACTURER_LOGO_MAX_BYTES) {
                setError(`Dosya ${Math.ceil(file.size / 1024)} KB; en fazla ${MANUFACTURER_LOGO_MAX_BYTES / 1024} KB olmalı.`);
                e.currentTarget.value = "";
                return;
              }
              setError("");
              setBusy(true);
              formRef.current?.requestSubmit();
            }}
          />
        </label>
      </form>
      {hasCustom ? (
        <form action={action} method="post">
          <input type="hidden" name="_action" value="remove" />
          <input type="hidden" name="next" value={next} />
          <button className="btn btn-ghost btn-xs" type="submit">
            Kaldır
          </button>
        </form>
      ) : null}
      {error ? <small className="mfr-error">{error}</small> : null}
    </div>
  );
}

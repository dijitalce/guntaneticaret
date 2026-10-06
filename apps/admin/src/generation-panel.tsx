import { ConfirmButton } from "./form-fields";
import { IconTrash } from "./icons";
import { withBase } from "./paths";
import { assetBase } from "./storefront";
import { VehicleImageForm } from "./vehicle-image-form";

type Generation = {
  id: string;
  name: string;
  bodyCode: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  imageUrl: string | null;
  isActive: boolean;
};

function Fields({ g }: { g?: Generation }) {
  return (
    <>
      <label className="gen-field">
        <span>Kasa kodu</span>
        <input className="input" name="bodyCode" defaultValue={g?.bodyCode ?? ""} placeholder="Örn. E90" maxLength={64} />
      </label>
      <label className="gen-field gen-year">
        <span>Başlangıç</span>
        <input className="input" name="yearFrom" type="number" inputMode="numeric" defaultValue={g?.yearFrom ?? ""} placeholder="2005" />
      </label>
      <label className="gen-field gen-year">
        <span>Bitiş</span>
        <input className="input" name="yearTo" type="number" inputMode="numeric" defaultValue={g?.yearTo ?? ""} placeholder="Devam" />
      </label>
      <label className="gen-active">
        <input type="checkbox" name="isActive" value="1" defaultChecked={g?.isActive ?? true} />
        Vitrinde
      </label>
    </>
  );
}

export function GenerationPanel({ modelId, modelName, generations }: { modelId: string; modelName: string; generations: Generation[] }) {
  const next = `/catalog/models/${modelId}`;
  const base = assetBase();
  return (
    <div className="gen-list">
      {generations.length === 0 ? (
        <p className="field-hint">
          Henüz kasa eklenmedi. Kasa eklerseniz vitrindeki menüde “{modelName}” yerine her kasa ayrı kart olarak (örn. “{modelName} E90 · 2005–2012”) görünür.
        </p>
      ) : null}
      {generations.map((g) => (
        <div key={g.id} className={`gen-row${g.isActive ? "" : " is-passive"}`}>
          <VehicleImageForm entity="generation" id={g.id} imageUrl={g.imageUrl} assetBase={base} next={next} label={`${modelName} ${g.name}`} compact />
          <form action={withBase(`/api/vehicle-generations/${g.id}`)} method="post" className="gen-form">
            <input type="hidden" name="_action" value="save" />
            <Fields g={g} />
            <button className="btn btn-secondary btn-sm" type="submit">Kaydet</button>
          </form>
          <form action={withBase(`/api/vehicle-generations/${g.id}`)} method="post">
            <input type="hidden" name="_action" value="delete" />
            <ConfirmButton className="btn btn-ghost btn-sm" message={`“${modelName} ${g.name}” kasası silinsin mi?`}>
              <IconTrash />
            </ConfirmButton>
          </form>
        </div>
      ))}
      <form action={withBase("/api/vehicle-generations")} method="post" className="gen-form gen-new">
        <input type="hidden" name="modelId" value={modelId} />
        <Fields />
        <button className="btn btn-primary btn-sm" type="submit">Kasa ekle</button>
      </form>
      <small className="field-hint">Fotoğrafı kasayı ekledikten sonra yükleyebilirsiniz. Bitiş yılı boşsa “devam ediyor” kabul edilir.</small>
    </div>
  );
}

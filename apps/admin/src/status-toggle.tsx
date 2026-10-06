import type { ReactNode } from "react";
import { ConfirmButton } from "./form-fields";
import { withBase } from "./paths";
import { StatusBadge, type Tone } from "./ui";

/** Durum rozeti ve yanında ne yapacağını söyleyen açık bir buton; rozetin kendisi tıklanmaz. */
export function StatusToggle({
  action,
  fields,
  on,
  tone,
  label,
  turnOn,
  turnOff,
  confirmOff,
}: {
  action: string;
  fields: Record<string, string>;
  on: boolean;
  tone: Tone;
  label: ReactNode;
  turnOn: string;
  turnOff: string;
  /** Verilirse kapatma işlemi bu mesajla onay ister. */
  confirmOff?: string;
}) {
  return (
    <form action={withBase(action)} method="post" className="status-toggle">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <StatusBadge tone={tone}>{label}</StatusBadge>
      {on && confirmOff ? (
        <ConfirmButton className="btn btn-ghost btn-xs" message={confirmOff}>
          {turnOff}
        </ConfirmButton>
      ) : (
        <button type="submit" className="btn btn-ghost btn-xs">
          {on ? turnOff : turnOn}
        </button>
      )}
    </form>
  );
}

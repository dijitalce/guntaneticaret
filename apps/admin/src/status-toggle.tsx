import type { ReactNode } from "react";
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
}: {
  action: string;
  fields: Record<string, string>;
  on: boolean;
  tone: Tone;
  label: ReactNode;
  turnOn: string;
  turnOff: string;
}) {
  return (
    <form action={withBase(action)} method="post" className="status-toggle">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <button type="submit" className="btn btn-ghost btn-xs">
        {on ? turnOff : turnOn}
      </button>
    </form>
  );
}

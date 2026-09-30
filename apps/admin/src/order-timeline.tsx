import type { OrderEvent } from "@guntan/db";
import { ConfirmButton } from "./form-fields";
import { withBase } from "./paths";
const KIND_LABEL: Record<string, string> = {
  created: "Sipariş",
  status: "Durum",
  payment: "Ödeme",
  shipment: "Kargo",
  comment: "Not",
  notification: "Bildirim",
  automation: "Otomasyon",
  conversion: "Dönüşüm",
  system: "Sistem",
};

function dayKey(d: Date | string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
}

export function OrderTimeline({ orderId, events }: { orderId: string; events: OrderEvent[] }) {
  const groups: { day: string; items: OrderEvent[] }[] = [];
  for (const e of events) {
    const day = dayKey(e.created_at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  const action = withBase(`/api/orders/${orderId}/comment`);

  return (
    <div className="timeline" id="zaman-cizelgesi">
      <form action={action} method="post" className="timeline-compose">
        <textarea className="input" name="body" rows={2} placeholder="Siparişe not ekleyin (ekip içi)…" required maxLength={4000} />
        <div className="timeline-compose-actions">
          <label className="check text-sm">
            <input type="checkbox" name="notify" value="1" /> Müşteriye e-posta ile gönder
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Not ekle
          </button>
        </div>
      </form>
      {groups.length === 0 ? (
        <p className="muted text-sm" style={{ margin: "0.75rem 0 0" }}>
          Bu sipariş için henüz kayıt yok. Yeni işlemler burada görünür.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="timeline-day">
            <div className="timeline-date">{g.day}</div>
            <ol>
              {g.items.map((e) => (
                <li key={e.id} className={`timeline-item is-${e.kind}`}>
                  <span className="timeline-dot" aria-hidden />
                  <div className="timeline-body">
                    <div className="timeline-head">
                      <strong>{e.title}</strong>
                      <span className="timeline-meta">
                        {KIND_LABEL[e.kind] ?? e.kind}
                        {e.actor ? ` · ${e.actor}` : ""} ·{" "}
                        {new Date(e.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
                      </span>
                    </div>
                    {e.body ? <p className={e.kind === "comment" ? "timeline-note" : undefined}>{e.body}</p> : null}
                    {e.kind === "comment" ? (
                      <form action={action} method="post" className="timeline-delete">
                        <input type="hidden" name="_action" value="delete" />
                        <input type="hidden" name="eventId" value={e.id} />
                        <ConfirmButton className="btn btn-ghost btn-xs" message="Not silinsin mi?">
                          Sil
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </div>
  );
}

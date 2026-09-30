"use client";

import { useState, type FormEvent } from "react";

export function StockAlertForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/stock-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="stock-alert-done">Ürün stoğa girdiğinde {email} adresine haber vereceğiz.</p>;
  }
  return (
    <form className="stock-alert" onSubmit={onSubmit}>
      <label htmlFor="stock-alert-email">Stoğa gelince haber ver</label>
      <div className="stock-alert-row">
        <input
          id="stock-alert-email"
          type="email"
          required
          placeholder="E-posta adresiniz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={state === "sending"}>
          Haber ver
        </button>
      </div>
      {state === "error" ? <small className="stock-alert-err">Kayıt yapılamadı, tekrar deneyin.</small> : null}
    </form>
  );
}

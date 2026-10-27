"use client";

import { useState } from "react";
import { IconWhatsapp } from "./icons";

const TOPICS = ["Parça talebi", "Sipariş durumu", "İade / değişim", "Toplu teklif", "Diğer"] as const;

/** Formu WhatsApp mesajına çevirir; sunucuya veri gönderilmez. */
export function ContactForm({ whatsapp }: { whatsapp: string }) {
  const [topic, setTopic] = useState<string>(TOPICS[0]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) ?? "").trim();
    const lines = [
      `Merhaba, ${topic.toLocaleLowerCase("tr")} hakkında yazıyorum.`,
      val("name") && `Ad soyad: ${val("name")}`,
      val("vehicle") && `Araç / şasi no: ${val("vehicle")}`,
      val("message"),
    ].filter(Boolean);
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="contact-topics" role="radiogroup" aria-label="Konu">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={topic === t}
            className={`contact-topic${topic === t ? " is-active" : ""}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="contact-form-row">
        <label>
          Ad soyad
          <input className="input" name="name" autoComplete="name" />
        </label>
        <label>
          Araç / şasi no
          <input className="input" name="vehicle" placeholder="Örn. Ford Focus 2015 veya şasi no" />
        </label>
      </div>
      <label>
        Mesajınız
        <textarea className="input" name="message" rows={4} required placeholder="Aradığınız parça veya sorunuz…" />
      </label>
      <button type="submit" className="btn btn-primary contact-submit">
        <IconWhatsapp /> WhatsApp ile gönder
      </button>
      <p className="contact-form-note">Gönder'e bastığınızda mesajınız WhatsApp'ta hazır açılır.</p>
    </form>
  );
}

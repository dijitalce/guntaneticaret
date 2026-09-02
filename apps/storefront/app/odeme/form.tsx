"use client";

export function CheckoutForm() {
  return (
    <form className="card" style={{ padding: "1rem", display: "grid", gap: "0.6rem", maxWidth: 480 }} action="/api/checkout" method="post">
      <label>Ad soyad<input className="input" name="fullName" required /></label>
      <label>E-posta<input className="input" type="email" name="email" required /></label>
      <label>Telefon<input className="input" name="phone" required /></label>
      <label>İl<input className="input" name="city" required /></label>
      <label>İlçe<input className="input" name="district" required /></label>
      <label>Adres<textarea name="line1" required /></label>
      <button className="btn btn-primary" type="submit">Siparişi oluştur</button>
    </form>
  );
}

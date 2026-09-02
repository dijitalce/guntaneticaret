import { AdminShell, requireAdmin } from "@/src/shell";
import { db, brandGroups } from "@guntan/db";

export default async function NewTenantPage() {
  await requireAdmin();
  const groups = await db.select().from(brandGroups);
  return (
    <AdminShell>
      <h1>Yeni site</h1>
      <form className="wizard" action="/api/tenants" method="post">
        <h2>1. Kimlik</h2>
        <input className="input" name="name" placeholder="Site adı" required />
        <input className="input" name="slug" placeholder="slug" required />
        <input className="input" name="hostname" placeholder="japon.localhost" required />

        <h2>2. Tema</h2>
        <label>Primary <input className="input" name="primary" type="color" defaultValue="#0f766e" /></label>
        <label>Secondary <input className="input" name="secondary" type="color" defaultValue="#1f2937" /></label>

        <h2>3. Katalog</h2>
        <label><input type="radio" name="visibilityMode" value="ALL" /> Tüm ürünler</label>
        <label><input type="radio" name="visibilityMode" value="GROUPS" defaultChecked /> Marka gruplarına göre</label>
        {groups.map((g) => (
          <label key={g.id}><input type="checkbox" name="groupIds" value={g.id} /> {g.name}</label>
        ))}

        <h2>4. İletişim</h2>
        <input className="input" name="phone" placeholder="Telefon" />
        <input className="input" name="whatsapp" placeholder="WhatsApp" />
        <input className="input" name="email" placeholder="E-posta" />

        <h2>5. SEO</h2>
        <input className="input" name="defaultMetaTitle" placeholder="Meta title" />
        <textarea name="defaultMetaDescription" placeholder="Meta description" />

        <h2>6. Banka</h2>
        <input className="input" name="bankName" placeholder="Banka adı" defaultValue="Ziraat Bankası" />
        <input className="input" name="accountHolder" placeholder="Hesap sahibi" />
        <input className="input" name="iban" placeholder="IBAN" />

        <button className="btn btn-primary" type="submit">Yayınla</button>
      </form>
    </AdminShell>
  );
}

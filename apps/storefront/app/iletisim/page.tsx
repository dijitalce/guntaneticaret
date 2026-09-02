import { getTenant } from "../../src/tenant";

export default async function ContactPage() {
  const tenant = await getTenant();
  return (
    <div className="container page-surface">
      <h1>İletişim</h1>
      <p>{tenant.address}</p>
      <p>{tenant.phone}</p>
      <p>{tenant.email}</p>
    </div>
  );
}

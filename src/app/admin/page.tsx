import { redirect } from "next/navigation";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, products } from "@/db/schema";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { getAdmin } from "@/lib/admin-auth";
import { attachProductImages } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const [productRows, initialOrders, initialCustomers] = await Promise.all([
    db.select().from(products).orderBy(asc(products.name)),
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select({ id: customers.id, name: customers.name, email: customers.email, createdAt: customers.createdAt }).from(customers).orderBy(desc(customers.createdAt)),
  ]);
  const initialProducts = await attachProductImages(productRows);
  return <AdminDashboard adminName={admin.name} initialProducts={initialProducts} initialOrders={initialOrders} initialCustomers={initialCustomers} />;
}
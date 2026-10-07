import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { getAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminDashboard adminName={admin.name} />;
}
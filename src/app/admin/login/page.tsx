import { redirect } from "next/navigation";
import AdminLogin from "@/components/admin/admin-login";
import { getAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return <AdminLogin />;
}
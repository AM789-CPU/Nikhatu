import { desc } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  try {
    const rows = await db.select({ id: customers.id, name: customers.name, email: customers.email, createdAt: customers.createdAt }).from(customers).orderBy(desc(customers.createdAt));
    return Response.json({ customers: rows });
  } catch {
    return Response.json({ error: "Unable to load customers" }, { status: 500 });
  }
}
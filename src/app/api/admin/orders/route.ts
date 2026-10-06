import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  try {
    return Response.json({ orders: await db.select().from(orders).orderBy(desc(orders.createdAt)) });
  } catch {
    return Response.json({ error: "Unable to load orders" }, { status: 500 });
  }
}
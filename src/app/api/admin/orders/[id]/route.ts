import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { parseOrderStatus } from "@/lib/admin-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const { id } = await params;
  if (!id || id.length > 240) return Response.json({ error: "Invalid order" }, { status: 400 });
  try {
    const body: unknown = await request.json();
    const status = typeof body === "object" && body !== null && !Array.isArray(body) ? parseOrderStatus((body as Record<string, unknown>).status) : null;
    if (!status) return Response.json({ error: "Choose a valid order status." }, { status: 400 });
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    return Response.json({ order });
  } catch {
    return Response.json({ error: "Unable to update order" }, { status: 400 });
  }
}
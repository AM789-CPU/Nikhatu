import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { parseAdminProduct } from "@/lib/admin-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const { id } = await params;
  if (!id || id.length > 240) return Response.json({ error: "Invalid product" }, { status: 400 });
  try {
    const input = parseAdminProduct(await request.json());
    if (!input) return Response.json({ error: "Check the product fields and try again." }, { status: 400 });
    const [product] = await db.update(products).set(input).where(eq(products.id, id)).returning();
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
    return Response.json({ product });
  } catch {
    return Response.json({ error: "Unable to update product" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const { id } = await params;
  if (!id || id.length > 240) return Response.json({ error: "Invalid product" }, { status: 400 });
  try {
    const [product] = await db.update(products).set({ isActive: false }).where(eq(products.id, id)).returning({ id: products.id });
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to remove product" }, { status: 500 });
  }
}
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { parseAdminProduct } from "@/lib/admin-validation";
import { randomUUID } from "node:crypto";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  try {
    return Response.json({ products: await db.select().from(products).orderBy(asc(products.name)) });
  } catch {
    return Response.json({ error: "Unable to load products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  try {
    const body = await request.json();
    const input = parseAdminProduct(body);
    if (!input) return Response.json({ error: "Check the product fields and try again." }, { status: 400 });
    const [product] = await db.insert(products).values({ id: `admin-${randomUUID()}`, ...input }).returning();
    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to create product" }, { status: 400 });
  }
}
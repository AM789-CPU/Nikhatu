import { randomUUID, randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, type ShippingAddress } from "@/db/schema";
import { getCustomer } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email." }, { status: 400 });
    const address = body.address as ShippingAddress | undefined;
    if (!address || ![address.name, address.phone, address.line1, address.city, address.state, address.pincode].every((s) => typeof s === "string" && s.trim().length > 0 && s.length <= 250)) return Response.json({ error: "Please complete your shipping address." }, { status: 400 });
    if (!/^\d{6}$/.test(address.pincode) || !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(address.phone.replace(/[\s-]/g, ""))) return Response.json({ error: "Enter a valid Indian mobile number and 6-digit PIN code." }, { status: 400 });
    const requested = body.items as { productId: string; size: string; quantity: number }[];
    if (!Array.isArray(requested) || !requested.length || requested.length > 30) return Response.json({ error: "Your bag is empty or too large." }, { status: 400 });
    if (requested.some((item) => !item || typeof item.productId !== "string" || typeof item.size !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) return Response.json({ error: "Please check your bag quantities." }, { status: 400 });
    const catalogue = await db.select().from(products).where(and(eq(products.isActive, true), inArray(products.id, requested.map((item) => item.productId))));
    const items = requested.map((item) => {
      const product = catalogue.find((p) => p.id === item.productId);
      if (!product || !product.sizes.includes(item.size)) throw new Error("One of the selected products or sizes is unavailable.");
      return { productId: product.id, name: product.name, size: item.size, quantity: item.quantity, price: product.price, image: product.image };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 1999 ? 0 : 99;
    const orderNumber = `NK-${randomBytes(4).toString("hex").toUpperCase()}`;
    const customer = await getCustomer();
    await db.insert(orders).values({ id: randomUUID(), orderNumber, customerId: customer?.id ?? null, email, items, address, subtotal, shipping, total: subtotal + shipping, paymentMethod: "cod" });
    return Response.json({ orderNumber, subtotal, shipping, total: subtotal + shipping, status: "confirmed" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error && error.message.includes("unavailable") ? error.message : "We couldn't place your order. Please try again." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = (searchParams.get("number") ?? "").trim().toUpperCase();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  if (!orderNumber || !email) return Response.json({ error: "Please enter your order number and email." }, { status: 400 });
  const [order] = await db.select({ orderNumber: orders.orderNumber, status: orders.status, total: orders.total, createdAt: orders.createdAt }).from(orders).where(and(eq(orders.orderNumber, orderNumber), eq(orders.email, email))).limit(1);
  if (!order) return Response.json({ error: "We couldn't find that order. Check your order number and email." }, { status: 404 });
  return Response.json({ order });
}

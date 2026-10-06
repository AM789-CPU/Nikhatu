import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, sessions } from "@/db/schema";
import { createSession, getCustomer, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  const customer = await getCustomer();
  if (!customer) return Response.json({ customer: null, orders: [] });
  const customerOrders = await db.select().from(orders).where(eq(orders.customerId, customer.id));
  return Response.json({ customer, orders: customerOrders.map(({ orderNumber, total, status, createdAt }) => ({ orderNumber, total, status, createdAt })) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) return Response.json({ error: "Enter a valid email and a password of 8–128 characters." }, { status: 400 });
    const [existing] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
    if (body.action === "register") {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
      if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });
      if (existing) return Response.json({ error: "This email already has an account. Please sign in." }, { status: 409 });
      const id = randomUUID();
      await db.insert(customers).values({ id, name, email, passwordHash: hashPassword(password) });
      await createSession(id);
      return Response.json({ customer: { id, name, email } });
    }
    if (!existing || !verifyPassword(password, existing.passwordHash)) return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
    await createSession(existing.id);
    return Response.json({ customer: { id: existing.id, name: existing.name, email: existing.email } });
  } catch {
    return Response.json({ error: "We couldn't sign you in. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nikhatu_session")?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  cookieStore.delete("nikhatu_session");
  return Response.json({ ok: true });
}

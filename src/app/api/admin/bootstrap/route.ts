import { randomUUID, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const setupSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const expectedToken = Buffer.from(setupSecret ?? "");
  const suppliedToken = Buffer.from(request.headers.get("x-admin-bootstrap-token") ?? "");
  if (!setupSecret || expectedToken.length < 32 || suppliedToken.length !== expectedToken.length || !timingSafeEqual(suppliedToken, expectedToken)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return Response.json({ error: "Invalid admin details" }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) {
      return Response.json({ error: "Use a name, valid email, and a 12–128 character password." }, { status: 400 });
    }

    const created = await db.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(264387201)`);
      const [existing] = await transaction.select({ id: adminUsers.id }).from(adminUsers).limit(1);
      if (existing) return false;
      await transaction.insert(adminUsers).values({ id: randomUUID(), name, email, passwordHash: hashPassword(password) });
      return true;
    });
    if (!created) return Response.json({ error: "Admin setup is already complete." }, { status: 409 });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Admin setup is already complete." }, { status: 409 });
    }
    return Response.json({ error: "Unable to create the initial admin" }, { status: 500 });
  }
}
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { createAdminSession, deleteAdminSession, getAdmin } from "@/lib/admin-auth";
import { hashPassword, verifyPassword } from "@/lib/auth";

const dummyPasswordHash = hashPassword("not-a-real-admin-password");

export async function GET() {
  try {
    return Response.json({ admin: await getAdmin() });
  } catch {
    return Response.json({ error: "Unable to verify admin session" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return Response.json({ error: "Invalid login details" }, { status: 400 });
    const input = body as Record<string, unknown>;
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) {
      return Response.json({ error: "Enter your admin email and password." }, { status: 400 });
    }
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    const passwordValid = verifyPassword(password, admin?.passwordHash ?? dummyPasswordHash);
    if (!admin || !passwordValid) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    await createAdminSession(admin.id);
    return Response.json({ admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch {
    return Response.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await deleteAdminSession();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to sign out" }, { status: 500 });
  }
}
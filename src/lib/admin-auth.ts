import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";

const cookieName = "nikhatu_admin_session";
const sessionDuration = 1000 * 60 * 60 * 8;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminUserId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDuration);
  await db.insert(adminSessions).values({ tokenHash: hashToken(token), adminUserId, expiresAt });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const [admin] = await db
    .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  return admin ?? null;
}

export async function deleteAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
  cookieStore.delete(cookieName);
}

export async function requireAdmin() {
  const admin = await getAdmin();
  return admin ?? Response.json({ error: "Unauthorized" }, { status: 401 });
}
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { customers, sessions } from "@/db/schema";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(customerId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessions).values({ token, customerId, expiresAt });
  (await cookies()).set("nikhatu_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function getCustomer() {
  const token = (await cookies()).get("nikhatu_session")?.value;
  if (!token) return null;
  const [result] = await db.select({ id: customers.id, name: customers.name, email: customers.email }).from(sessions).innerJoin(customers, eq(sessions.customerId, customers.id)).where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date()))).limit(1);
  return result ?? null;
}

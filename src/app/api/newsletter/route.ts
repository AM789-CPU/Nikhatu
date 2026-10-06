import { db } from "@/db";
import { subscribers } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    await db.insert(subscribers).values({ email }).onConflictDoNothing();
    return Response.json({ message: "You're on the list. Welcome to the NIKHATU circle." });
  } catch {
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

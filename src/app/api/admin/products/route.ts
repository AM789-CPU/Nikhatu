import { asc } from "drizzle-orm";
import { db } from "@/db";
import { productImages, productMedia, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { parseAdminProduct, parseAdminProductImages, parseAdminProductMedia } from "@/lib/admin-validation";
import { randomUUID } from "node:crypto";
import { attachProductImages } from "@/lib/product-images";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  try {
    const rows = await db.select().from(products).orderBy(asc(products.name));
    return Response.json({ products: await attachProductImages(rows) });
  } catch {
    return Response.json({ error: "Unable to load products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  try {
    const body: unknown = await request.json();
    const input = parseAdminProduct(body);
    if (!input) return Response.json({ error: "Check the product fields and try again." }, { status: 400 });
    const imagesValue = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>).images : undefined;
    const images = parseAdminProductImages(imagesValue, input.image);
    if (!images) return Response.json({ error: "Add between 1 and 8 valid product images, with exactly one primary image." }, { status: 400 });
    const mediaValue = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>).media : undefined;
    const media = parseAdminProductMedia(mediaValue);
    if (!media) return Response.json({ error: "Add up to 2 MP4/WEBM videos and up to 36 valid 360 image frames." }, { status: 400 });
    const primary = images.find((image) => image.isPrimary)!;
    const product = await db.transaction(async (transaction) => {
      const [created] = await transaction.insert(products).values({ id: `admin-${randomUUID()}`, ...input, image: primary.url }).returning();
      const savedImages = await transaction.insert(productImages).values(images.map((image) => ({ id: randomUUID(), productId: created.id, ...image }))).returning();
      const mediaRows = [...media.videos.map((item) => ({ ...item, type: "video" })), ...media.spinFrames.map((item) => ({ ...item, type: "360" }))];
      const savedMedia = mediaRows.length ? await transaction.insert(productMedia).values(mediaRows.map((item) => ({ id: randomUUID(), productId: created.id, ...item }))).returning() : [];
      return { ...created, image: primary.url, images: savedImages, media: savedMedia };
    });
    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to create product" }, { status: 400 });
  }
}
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { productImages, productMedia, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { parseAdminProduct, parseAdminProductImages, parseAdminProductMedia } from "@/lib/admin-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const { id } = await params;
  if (!id || id.length > 240) return Response.json({ error: "Invalid product" }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return Response.json({ error: "Invalid product update." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const fieldNames = ["name", "description", "department", "category", "price", "originalPrice", "image", "color", "colorHex", "sizes", "badge", "featured", "isActive"] as const;
    const has = (field: string) => Object.prototype.hasOwnProperty.call(input, field);
    const result = await db.transaction(async (transaction) => {
      const [existing] = await transaction.select().from(products).where(eq(products.id, id)).limit(1);
      if (!existing) return { missing: true as const };
      const existingImages = await transaction.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder));
      const existingMedia = await transaction.select().from(productMedia).where(eq(productMedia.productId, id)).orderBy(asc(productMedia.sortOrder));
      const primaryExisting = existingImages.find((image) => image.isPrimary) ?? existingImages[0];
      const imageWasSubmitted = has("image");
      const galleryWasSubmitted = has("images");
      const mediaWasSubmitted = has("media");
      const primaryCandidate = typeof input.image === "string" ? input.image : existing.image;
      const validated = parseAdminProduct({ ...existing, ...input, image: primaryCandidate });
      if (!validated) return { invalid: true as const };

      let imagesToSave: { url: string; sortOrder: number; isPrimary: boolean }[] | undefined;
      if (galleryWasSubmitted) {
        imagesToSave = parseAdminProductImages(input.images, primaryCandidate) ?? undefined;
        if (!imagesToSave) return { invalidImages: true as const };
      } else if (imageWasSubmitted && validated.image !== (primaryExisting?.url ?? existing.image)) {
        const currentImages = existingImages.length ? existingImages : [{ url: existing.image, sortOrder: 0, isPrimary: true }];
        imagesToSave = parseAdminProductImages(currentImages.map((image) => ({
          url: image.isPrimary || (!primaryExisting && image.sortOrder === 0) ? validated.image : image.url,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary || (!primaryExisting && image.sortOrder === 0),
        })), validated.image) ?? undefined;
        if (!imagesToSave) return { invalidImages: true as const };
      }
      const media = mediaWasSubmitted ? parseAdminProductMedia(input.media) : null;
      if (mediaWasSubmitted && !media) return { invalidMedia: true as const };

      const update: Record<string, unknown> = {};
      for (const field of fieldNames) if (has(field)) update[field] = validated[field];
      if (imagesToSave) update.image = imagesToSave.find((image) => image.isPrimary)!.url;
      if (!Object.keys(update).length && !imagesToSave && !mediaWasSubmitted) return { invalid: true as const };
      let product = existing;
      if (Object.keys(update).length) {
        const [updatedProduct] = await transaction.update(products).set(update).where(eq(products.id, id)).returning();
        if (updatedProduct) product = updatedProduct;
      }
      let savedImages = existingImages;
      if (imagesToSave) {
        await transaction.delete(productImages).where(eq(productImages.productId, id));
        savedImages = await transaction.insert(productImages).values(imagesToSave.map((image) => ({ id: randomUUID(), productId: id, ...image }))).returning();
      }
      let savedMedia = existingMedia;
      if (media) {
        await transaction.delete(productMedia).where(eq(productMedia.productId, id));
        const mediaRows = [...media.videos.map((item) => ({ ...item, type: "video" })), ...media.spinFrames.map((item) => ({ ...item, type: "360" }))];
        savedMedia = mediaRows.length ? await transaction.insert(productMedia).values(mediaRows.map((item) => ({ id: randomUUID(), productId: id, ...item }))).returning() : [];
      }
      const primary = savedImages.find((image) => image.isPrimary) ?? savedImages[0];
      return { product: { ...product, image: primary?.url ?? product.image, images: savedImages, media: savedMedia } };
    });
    if ("missing" in result) return Response.json({ error: "Product not found" }, { status: 404 });
    if ("invalidImages" in result) return Response.json({ error: "Add between 1 and 8 valid product images, with exactly one primary image." }, { status: 400 });
    if ("invalidMedia" in result) return Response.json({ error: "Add up to 2 MP4/WEBM videos and up to 36 valid 360 image frames." }, { status: 400 });
    if ("invalid" in result) return Response.json({ error: "Check the product fields and try again." }, { status: 400 });
    return Response.json({ product: result.product });
  } catch {
    return Response.json({ error: "Unable to update product" }, { status: 500 });
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
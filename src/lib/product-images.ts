import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productImages, productMedia, type products } from "@/db/schema";
import type { Product, ProductImage } from "@/lib/products";

type ProductRow = typeof products.$inferSelect;

export async function attachProductImages(rows: ProductRow[]): Promise<Product[]> {
  if (!rows.length) return [];
  const [imageRows, mediaRows] = await Promise.all([
    db.select().from(productImages).where(inArray(productImages.productId, rows.map((product) => product.id))).orderBy(asc(productImages.sortOrder)),
    db.select().from(productMedia).where(inArray(productMedia.productId, rows.map((product) => product.id))).orderBy(asc(productMedia.sortOrder)),
  ]);
  return rows.map((product) => {
    const images = imageRows.filter((image) => image.productId === product.id);
    if (!images.length) {
      const fallback: ProductImage = {
        id: `legacy-${product.id}`,
        productId: product.id,
        url: product.image,
        sortOrder: 0,
        isPrimary: true,
        createdAt: new Date(0),
      };
      return { ...product, image: product.image, images: [fallback], media: mediaRows.filter((media) => media.productId === product.id) };
    }
    const primary = images.find((image) => image.isPrimary) ?? images[0];
    return { ...product, image: primary.url, images, media: mediaRows.filter((media) => media.productId === product.id) };
  });
}
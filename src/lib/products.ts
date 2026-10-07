import type { productImages, productMedia, products } from "@/db/schema";

export type ProductImage = typeof productImages.$inferSelect;
export type ProductMedia = typeof productMedia.$inferSelect;
export type Product = typeof products.$inferSelect & { images?: ProductImage[]; media?: ProductMedia[] };
export const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export type Theme = "classic" | "monster";
export const themeOf = (product: Pick<Product, "id">): Theme => product.id.startsWith("monster-") ? "monster" : "classic";

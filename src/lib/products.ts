import type { productImages, productMedia, products } from "@/db/schema";

export type ProductImage = typeof productImages.$inferSelect;

export type ProductMedia = typeof productMedia.$inferSelect;

export type Product = typeof products.$inferSelect & {
  images?: ProductImage[];
  media?: ProductMedia[];
  themes?: string[];
};

export const formatPrice = (value: number) =>
  `₹${value.toLocaleString("en-IN")}`;

export type Theme = "classic" | "monster";

export function productHasTheme(
  product: Pick<Product, "themes">,
  theme: Theme,
): boolean {
  return product.themes?.includes(theme) ?? false;
}
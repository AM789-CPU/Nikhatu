import type { products } from "@/db/schema";

export type Product = typeof products.$inferSelect;
export const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export type Theme = "classic" | "monster";
export const themeOf = (product: Pick<Product, "id">): Theme => product.id.startsWith("monster-") ? "monster" : "classic";

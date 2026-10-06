import type { Metadata } from "next";
import Storefront from "@/components/storefront";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The Collection — NIKHATU", description: "Shop thoughtfully made Indian fashion for men, women, and kids. Your everyday, elevated." };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string }> }) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);
  return <Storefront key={`${params.category || "all"}-${params.sort || "featured"}`} products={products} shopping initialCategory={params.category} initialSort={params.sort} />;
}

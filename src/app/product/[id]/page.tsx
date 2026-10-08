import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductPage from "@/components/product-page";
import {
  getProductById,
  getProducts,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

type ProductRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductRouteProps): Promise<Metadata> {
  const { id } = await params;

  const product = await getProductById(
    decodeURIComponent(id),
  );

  if (!product) {
    return {
      title: "Product not found — NIKHATU",
    };
  }

  return {
    title: `${product.name} — NIKHATU`,
    description: product.description,
  };
}

export default async function ProductRoute({
  params,
}: ProductRouteProps) {
  const { id } = await params;

  const decodedId = decodeURIComponent(id);

  const [product, products] =
    await Promise.all([
      getProductById(decodedId),
      getProducts(),
    ]);

  if (!product) {
    notFound();
  }

  const productThemes = product.themes ?? [];

  const relatedProducts = products
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.themes ?? []).some((theme) =>
          productThemes.includes(theme),
        ),
    )
    .slice(0, 4);

  return (
    <ProductPage
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}
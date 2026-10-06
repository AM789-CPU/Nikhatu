import Storefront from "@/components/storefront";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();
  return <Storefront products={products} />;
}

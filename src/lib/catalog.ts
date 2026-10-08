import { db } from "@/db";

import {
  productMedia,
  productThemes,
  products,
} from "@/db/schema";

import { eq, inArray } from "drizzle-orm";

import { attachProductImages } from "@/lib/product-images";

import type { Product } from "@/lib/products";

const catalogue: typeof products.$inferInsert[] = [
  {
    id: "classic-chore-jacket",
    name: "The Indigo Chore Jacket",
    description:
      "Heavy washed indigo denim with three utility pockets and brass buttons. A premium everyday layer that only gets better with wear.",
    department: "men",
    category: "Jackets",
    price: 3999,
    originalPrice: 4999,
    image: "/images/classic/chore-jacket.jpg",
    color: "Indigo",
    colorHex: "#1f3a6b",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "BESTSELLER",
    featured: true,
  },

  {
    id: "classic-grey-pinstripe",
    name: "The Grey Pinstripe Shirt",
    description:
      "Textured slate-grey cotton with crisp white stripes and a classic collar. Smart on its own, easy under a jacket.",
    department: "men",
    category: "Shirts",
    price: 2299,
    originalPrice: 2899,
    image: "/images/classic/grey-stripe.jpg",
    color: "Slate grey",
    colorHex: "#7b7b7b",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "NEW IN",
    featured: true,
  },

  {
    id: "classic-trucker",
    name: "The Burgundy Trucker Jacket",
    description:
      "A washed burgundy denim trucker with twin chest pockets and antique metal buttons. Rich colour, timeless cut.",
    department: "men",
    category: "Jackets",
    price: 4299,
    originalPrice: 5399,
    image: "/images/classic/trucker.jpg",
    color: "Burgundy",
    colorHex: "#5c1f26",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "NEW IN",
    featured: true,
  },

  {
    id: "classic-burgundy-stripe",
    name: "The Burgundy Stripe Shirt",
    description:
      "Deep burgundy with fine cream pinstripes in a crisp cotton poplin. Roll the cuffs and go.",
    department: "women",
    category: "Shirts",
    price: 2199,
    originalPrice: 2799,
    image: "/images/classic/burgundy-stripe.jpg",
    color: "Burgundy",
    colorHex: "#6b1a28",
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "BESTSELLER",
    featured: true,
  },

  {
    id: "classic-plaid-shirt",
    name: "The Sage Plaid Shirt",
    description:
      "Soft brushed cotton in a calm sage and cream plaid. Relaxed fit, chest pocket, easy all season.",
    department: "women",
    category: "Shirts",
    price: 2199,
    originalPrice: 2799,
    image: "/images/classic/plaid.jpg",
    color: "Sage plaid",
    colorHex: "#9fb3b0",
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "NEW IN",
    featured: false,
  },

  {
    id: "classic-rugby-polo",
    name: "The Rugby Stripe Polo",
    description:
      "A heavyweight rugby polo in cream and burgundy block stripes, with a soft collar and rolled cuffs.",
    department: "kids",
    category: "Polos",
    price: 1299,
    originalPrice: 1699,
    image: "/images/classic/rugby.jpg",
    color: "Cream / Burgundy",
    colorHex: "#6b1a28",
    sizes: ["6–7 Y", "8–9 Y", "10–11 Y", "12–13 Y"],
    badge: "NEW IN",
    featured: false,
  },

  {
    id: "monster-saint-olive-jacket",
    name: "The Saint Olive Flame Jacket",
    description:
      "Washed olive work jacket with chenille Saint lettering, airbrushed flames down the sleeves and heavily distressed trims. Loud, worn-in, one of a kind.",
    department: "men",
    category: "Jackets",
    price: 5499,
    originalPrice: 6999,
    image: "/images/monster/collection/saint-olive-jacket.jpg",
    color: "Washed olive",
    colorHex: "#6b7a55",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "BESTSELLER",
    featured: true,
  },

  {
    id: "monster-money-tee",
    name: "All We Need Is Money Tee",
    description:
      "Heavy washed-olive tee with a dripping spray-paint message across the front. Oversized, boxy and made to be worn loud.",
    department: "men",
    category: "Tees",
    price: 1699,
    originalPrice: 2199,
    image: "/images/monster/collection/money-tee.jpg",
    color: "Washed olive",
    colorHex: "#5b5a47",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "BESTSELLER",
    featured: true,
  },

  {
    id: "monster-gothic-jeans",
    name: "The Gothic Print Wide-Leg Jeans",
    description:
      "Black wide-leg denim covered in a collage of crosses, stars, chains and moons, with a scatter of tiny studs. Pure night energy.",
    department: "men",
    category: "Jeans",
    price: 4199,
    originalPrice: 5299,
    image: "/images/monster/collection/gothic-jeans.jpg",
    color: "Black",
    colorHex: "#151518",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "NEW IN",
    featured: true,
  },

  {
    id: "monster-saints-sweatshirt",
    name: "The Saints Vintage Waffle Sweatshirt",
    description:
      "Distressed waffle-knit crew with gothic cross artwork and script lettering. Cropped, boxy and beautifully ruined at the edges.",
    department: "women",
    category: "Sweatshirts",
    price: 2999,
    originalPrice: 3799,
    image: "/images/monster/collection/saints-sweatshirt.jpg",
    color: "Bone white",
    colorHex: "#d9d6cf",
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "NEW IN",
    featured: true,
  },

  {
    id: "monster-saint-denim-jacket",
    name: "The Saint Tears Denim Jacket",
    description:
      "Faded blue work jacket with a corduroy collar, stitched Saint patches and a torn art-dept label. Vintage attitude, zero polish.",
    department: "men",
    category: "Jackets",
    price: 5999,
    originalPrice: 7499,
    image: "/images/monster/collection/saint-denim-jacket.jpg",
    color: "Faded indigo",
    colorHex: "#4a5568",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "NEW IN",
    featured: false,
  },

  {
    id: "monster-scribble-tee",
    name: "The Scribble Graphic Tee",
    description:
      "Acid-washed charcoal tee scratched with a signature scribble and finished with black bead embroidery.",
    department: "men",
    category: "Tees",
    price: 1799,
    originalPrice: 2299,
    image: "/images/monster/collection/scribble-tee.jpg",
    color: "Charcoal",
    colorHex: "#3a3a3d",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "NEW IN",
    featured: false,
  },

  {
    id: "monster-starburst-jeans",
    name: "The Starburst Wide-Leg Jeans",
    description:
      "Washed charcoal denim with heavy whiskering and hand-drawn starbursts along the side seams. Balloon fit, big attitude.",
    department: "women",
    category: "Jeans",
    price: 3699,
    originalPrice: 4599,
    image: "/images/monster/collection/starburst-jeans.jpg",
    color: "Washed charcoal",
    colorHex: "#4a4a4d",
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "NEW IN",
    featured: false,
  },

  {
    id: "monster-melancholy-thermal",
    name: "The Melancholy Thermal Shirt",
    description:
      "Soft white thermal with a gothic castle print and script lettering running down both sleeves.",
    department: "kids",
    category: "Thermals",
    price: 1599,
    originalPrice: 1999,
    image: "/images/monster/collection/melancholy-thermal.jpg",
    color: "White / Black",
    colorHex: "#e9e9e9",
    sizes: ["8–9 Y", "10–11 Y", "12–13 Y", "14–15 Y"],
    badge: "NEW IN",
    featured: false,
  },
];

async function syncCatalogueThemes() {
  const catalogueIds = catalogue.map((product) => product.id);

  if (!catalogueIds.length) return;

  const existing = await db
    .select({
      productId: productThemes.productId,
      themeId: productThemes.themeId,
    })
    .from(productThemes)
    .where(inArray(productThemes.productId, catalogueIds));

  const existingKeys = new Set(
    existing.map(
      (row) => `${row.productId}:${row.themeId}`,
    ),
  );

  const missing = catalogue
    .map((product) => ({
      productId: product.id,
      themeId: product.id.startsWith("monster-")
        ? "monster"
        : "classic",
    }))
    .filter(
      (row) =>
        !existingKeys.has(
          `${row.productId}:${row.themeId}`,
        ),
    );

  if (!missing.length) return;

  await db.insert(productThemes).values(missing);
}

async function attachThemes<T extends { id: string }>(
  rows: T[],
): Promise<(T & { themes: string[] })[]> {
  if (!rows.length) return [];

  const themeRows = await db
    .select({
      productId: productThemes.productId,
      themeId: productThemes.themeId,
    })
    .from(productThemes)
    .where(
      inArray(
        productThemes.productId,
        rows.map((row) => row.id),
      ),
    );

  const themesByProduct = new Map<string, string[]>();

  for (const row of themeRows) {
    const current =
      themesByProduct.get(row.productId) ?? [];

    current.push(row.themeId);

    themesByProduct.set(
      row.productId,
      current,
    );
  }

  return rows.map((row) => ({
    ...row,
    themes:
      themesByProduct.get(row.id) ?? [],
  }));
}

export async function getProducts(): Promise<Product[]> {
  try {
    await db
      .insert(products)
      .values(catalogue)
      .onConflictDoNothing();

    await syncCatalogueThemes();

    const rows = await attachProductImages(
      await db
        .select()
        .from(products)
        .where(eq(products.isActive, true)),
    );

    const themedRows = await attachThemes(rows);

    return themedRows.sort((a, b) => {
      const aPosition = catalogue.findIndex(
        (product) => product.id === a.id,
      );

      const bPosition = catalogue.findIndex(
        (product) => product.id === b.id,
      );

      if (
        aPosition >= 0 &&
        bPosition >= 0
      ) {
        return aPosition - bPosition;
      }

      if (aPosition >= 0) return -1;

      if (bPosition >= 0) return 1;

      return (
        Number(b.featured) -
          Number(a.featured) ||
        a.name.localeCompare(b.name)
      );
    }) as Product[];
  } catch (error) {
    console.error(
      "getProducts fell back to static catalogue:",
      error,
    );

    return catalogue.map((product) => ({
      ...product,
      originalPrice:
        product.originalPrice ?? null,
      badge: product.badge ?? null,
      featured: product.featured ?? false,
      isActive: true,

      images: [
        {
          id: `legacy-${product.id}`,
          productId: product.id,
          url: product.image,
          sortOrder: 0,
          isPrimary: true,
          createdAt: new Date(0),
        },
      ],

      themes: [
        product.id.startsWith("monster-")
          ? "monster"
          : "classic",
      ],
    })) as Product[];
  }
}

export async function getProductById(
  id: string,
): Promise<Product | null> {
  if (!id || id.length > 240) return null;

  try {
    await db
      .insert(products)
      .values(catalogue)
      .onConflictDoNothing();

    await syncCatalogueThemes();

    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!row || !row.isActive) {
      return null;
    }

    const [
      withImages,
      withMedia,
      withThemes,
    ] = await Promise.all([
      attachProductImages([row]),

      db
        .select()
        .from(productMedia)
        .where(
          eq(productMedia.productId, id),
        )
        .orderBy(productMedia.sortOrder),

      attachThemes([row]),
    ]);

    return {
      ...withImages[0],
      media: withMedia,
      themes:
        withThemes[0]?.themes ?? [],
    } as Product;
  } catch (error) {
    console.error(
      "getProductById failed:",
      error,
    );

    const fallback = catalogue.find(
      (product) => product.id === id,
    );

    if (!fallback) return null;

    return {
      ...fallback,
      originalPrice:
        fallback.originalPrice ?? null,
      badge: fallback.badge ?? null,
      featured:
        fallback.featured ?? false,
      isActive: true,

      images: [
        {
          id: `legacy-${fallback.id}`,
          productId: fallback.id,
          url: fallback.image,
          sortOrder: 0,
          isPrimary: true,
          createdAt: new Date(0),
        },
      ],

      media: [],

      themes: [
        fallback.id.startsWith("monster-")
          ? "monster"
          : "classic",
      ],
    } as Product;
  }
}

export const formatPrice = (value: number) =>
  `₹${value.toLocaleString("en-IN")}`;
const departments = new Set(["men", "women", "kids"]);

export type AdminProductInput = {
  name: string;
  description: string;
  department: string;
  category: string;
  price: number;
  originalPrice: number | null;
  image: string;
  color: string;
  colorHex: string;
  sizes: string[];
  badge: string | null;
  featured: boolean;
  isActive: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
}

function validImage(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseAdminProduct(value: unknown): AdminProductInput | null {
  if (!isRecord(value)) return null;
  const name = text(value.name, 160);
  const description = text(value.description, 4000);
  const department = text(value.department, 10);
  const category = text(value.category, 80);
  const color = text(value.color, 80);
  const image = value.image;
  const colorHex = typeof value.colorHex === "string" && /^#[\da-f]{6}$/i.test(value.colorHex) ? value.colorHex : null;
  const badge = value.badge === null || value.badge === "" ? null : text(value.badge, 40);
  const originalPrice = value.originalPrice === null || value.originalPrice === "" ? null : value.originalPrice;
  const sizes = value.sizes;

  if (!name || !description || !department || !departments.has(department) || !category || !color || !colorHex) return null;
  if (!validImage(image) || !Number.isSafeInteger(value.price) || (value.price as number) < 1 || (value.price as number) > 10_000_000) return null;
  if (originalPrice !== null && (!Number.isSafeInteger(originalPrice) || (originalPrice as number) < 0 || (originalPrice as number) > 10_000_000)) return null;
  if (value.badge !== null && value.badge !== "" && !badge) return null;
  if (!Array.isArray(sizes) || sizes.length < 1 || sizes.length > 32 || sizes.some((size) => typeof size !== "string" || !size.trim() || size.trim().length > 24)) return null;
  const normalizedSizes = sizes.map((size) => (size as string).trim());
  if (new Set(normalizedSizes).size !== normalizedSizes.length) return null;
  if (typeof value.featured !== "boolean" || typeof value.isActive !== "boolean") return null;

  return {
    name,
    description,
    department,
    category,
    price: value.price as number,
    originalPrice: originalPrice as number | null,
    image: image.trim(),
    color,
    colorHex,
    sizes: normalizedSizes,
    badge,
    featured: value.featured,
    isActive: value.isActive,
  };
}

export const orderStatuses = ["confirmed", "processing", "shipped", "delivered", "cancelled", "returned"] as const;
export type AdminOrderStatus = (typeof orderStatuses)[number];

export function parseOrderStatus(value: unknown): AdminOrderStatus | null {
  return typeof value === "string" && orderStatuses.some((status) => status === value) ? value as AdminOrderStatus : null;
}
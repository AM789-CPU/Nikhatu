export type CartItem = { productId: string; size: string; quantity: number };
export type Customer = { id: string; name: string; email: string };
export type OrderSummary = { orderNumber: string; total: number; status: string; createdAt: string };
export type PlacedOrder = { orderNumber: string; total: number; subtotal: number; shipping: number; status: string };
export type InfoTopic = "help" | "delivery" | "returns" | "quality" | "payments" | "story" | "privacy" | "size";
export type Panel = "cart" | "wishlist" | "search" | "account" | "checkout" | "track" | InfoTopic | null;

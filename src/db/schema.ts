import { pgTable, text, integer, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  department: text("department").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  image: text("image").notNull(),
  color: text("color").notNull(),
  colorHex: text("color_hex").notNull(),
  sizes: jsonb("sizes").$type<string[]>().notNull(),
  badge: text("badge"),
  featured: boolean("featured").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const productThemes = pgTable("product_themes", {
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),

  themeId: text("theme_id")
    .references(() => themes.id, { onDelete: "cascade" })
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("product_themes_product_idx").on(table.productId),
  index("product_themes_theme_idx").on(table.themeId),
]);

export const productImages = pgTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("product_images_product_order_idx").on(table.productId, table.sortOrder)]);

export const productMedia = pgTable("product_media", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("product_media_product_type_order_idx").on(table.productId, table.type, table.sortOrder)]);

export const subscribers = pgTable("subscribers", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  adminUserId: text("admin_user_id").references(() => adminUsers.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [index("admin_sessions_user_idx").on(table.adminUserId)]);

export type OrderLine = { productId: string; name: string; size: string; quantity: number; price: number; image: string };
export type ShippingAddress = { name: string; phone: string; line1: string; city: string; state: string; pincode: string };

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").unique().notNull(),
  customerId: text("customer_id").references(() => customers.id),
  email: text("email").notNull(),
  items: jsonb("items").$type<OrderLine[]>().notNull(),
  address: jsonb("address").$type<ShippingAddress>().notNull(),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  paymentMethod: text("payment_method").default("cod").notNull(),
  status: text("status").default("confirmed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

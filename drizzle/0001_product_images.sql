CREATE TABLE IF NOT EXISTS "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_product_order_idx" ON "product_images" USING btree ("product_id", "sort_order");
--> statement-breakpoint
INSERT INTO "product_images" ("id", "product_id", "url", "sort_order", "is_primary")
SELECT gen_random_uuid()::text, product."id", product."image", 0, true
FROM "products" AS product
WHERE NOT EXISTS (
	SELECT 1 FROM "product_images" AS image
	WHERE image."product_id" = product."id"
);
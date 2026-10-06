ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"admin_user_id" text NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_sessions_user_idx" ON "admin_sessions" USING btree ("admin_user_id");
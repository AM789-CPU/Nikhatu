# Admin setup

The admin area uses its own account table, session table, and HTTP-only cookie. Customer accounts do not grant admin access. Set `DATABASE_URL` to the existing Neon connection string in the deployment environment. Drizzle Kit reads the same variable through `drizzle.config.ts`; no credentials are stored in the repository.

Product images are uploaded directly from the browser to a public Vercel Blob store using short-lived, admin-authorized upload tokens. Connect a Blob store to the Vercel project and make `BLOB_READ_WRITE_TOKEN` available to the server runtime; the browser only receives a constrained upload token. Local development also needs this variable. Product rows continue to store only the resulting image URL.

## Migration review

The migrations in `drizzle/` have not been applied. `0000_admin_management.sql` contains only these additive statements:

```sql
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "token_hash" text PRIMARY KEY NOT NULL,
  "admin_user_id" text NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
  "expires_at" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "admin_sessions_user_idx" ON "admin_sessions" USING btree ("admin_user_id");
```

The new product flag defaults existing rows to active. Admin deletion sets this flag false instead of deleting product data. The SQL does not drop, truncate, recreate, or update existing customer, session, subscriber, or order records. Review and approve before running `npm run db:migrate` against Neon.

`0001_product_images.sql` adds `product_images` with a cascading foreign key to `products`, an ordering index, and a one-time backfill that associates each existing `products.image` URL as that product's primary image. It only inserts association rows for products that do not already have them; it does not modify or delete product rows or image files.

`0002_product_media.sql` adds a cascading `product_media` table for ordered video URLs and 360-degree frame URLs. Existing product and image rows are not changed.

## Create the first admin

Set `ADMIN_BOOTSTRAP_SECRET` in the server environment to a random value of at least 32 characters. The bootstrap endpoint requires it in the `x-admin-bootstrap-token` header and becomes permanently unavailable after the first admin account is created. Send one POST request to `/api/admin/bootstrap` with JSON containing `name`, `email`, and a unique password of 12–128 characters. Do not put the secret or password in source control, deployment logs, or a public client.

After the migration is approved and applied and the initial admin is provisioned, sign in at `/admin/login`. Admin sessions expire after eight hours; login uses the existing scrypt password hashing implementation, with separate hashed session tokens.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "featured";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "bestseller";

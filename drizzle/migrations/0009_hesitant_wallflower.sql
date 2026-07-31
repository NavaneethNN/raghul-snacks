ALTER TABLE "coupons" ADD COLUMN "min_order_value" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "valid_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "valid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "applicable_products" text[];--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "applicable_categories" text[];
ALTER TABLE "coupons" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_discount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "total_usage" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "per_customer" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "apply_to" text DEFAULT 'entire_store' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "first_purchase" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "public_coupon" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "notes" text;
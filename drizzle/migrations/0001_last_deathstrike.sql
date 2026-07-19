ALTER TABLE "orders" ADD COLUMN "city" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pincode" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shiprocket_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "awb_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_status" text DEFAULT 'pending' NOT NULL;
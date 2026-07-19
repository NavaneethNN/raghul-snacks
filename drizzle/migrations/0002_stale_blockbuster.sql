ALTER TABLE "orders" ADD COLUMN "payment_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "razorpay_order_id";
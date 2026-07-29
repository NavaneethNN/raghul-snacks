ALTER TABLE "banners" ALTER COLUMN "href" SET DEFAULT '/shop';--> statement-breakpoint
ALTER TABLE "banners" ALTER COLUMN "href" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "eyebrow" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "offer_text" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "button_text" text DEFAULT 'Shop Now' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "validity_text" text;
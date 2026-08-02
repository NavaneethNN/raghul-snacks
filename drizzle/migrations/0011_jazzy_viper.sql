ALTER TABLE "customer_accounts" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_accounts" ADD COLUMN "google_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_accounts_google_id_unique" ON "customer_accounts" USING btree ("google_id");
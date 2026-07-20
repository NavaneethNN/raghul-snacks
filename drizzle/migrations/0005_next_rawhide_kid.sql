CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"icon" text,
	"active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text;
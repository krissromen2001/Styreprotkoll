ALTER TABLE "users" ADD COLUMN "google_calendar_access_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_calendar_refresh_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_calendar_token_expires_at" timestamp;

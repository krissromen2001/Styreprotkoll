ALTER TABLE "meetings" ADD COLUMN "meeting_mode" varchar(20) DEFAULT 'physical';
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "meeting_link" text;

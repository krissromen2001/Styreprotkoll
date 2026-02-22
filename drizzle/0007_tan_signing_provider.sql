ALTER TABLE "meetings" ADD COLUMN "signed_protocol_storage_path" text;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "signing_provider" varchar(100);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "signing_method" varchar(100);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "signing_provider_session_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "signature_level" varchar(50);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "signing_completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "signed_at_provider" timestamp;
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "provider" varchar(100);
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "provider_signer_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "provider_status" varchar(100);
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "signature_level" varchar(50);
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "evidence_storage_path" text;
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "raw_provider_meta" text;

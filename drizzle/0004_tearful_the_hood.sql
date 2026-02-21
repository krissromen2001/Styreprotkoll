ALTER TABLE "meetings" ADD COLUMN "signicat_document_id" text;--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "signicat_signer_id" text;--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "signicat_sign_url" text;
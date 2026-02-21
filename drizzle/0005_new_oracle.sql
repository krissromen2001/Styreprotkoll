CREATE TABLE "meeting_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"board_member_id" uuid NOT NULL,
	"present" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_board_member_id_board_members_id_fk" FOREIGN KEY ("board_member_id") REFERENCES "public"."board_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" DROP COLUMN "signicat_document_id";--> statement-breakpoint
ALTER TABLE "signatures" DROP COLUMN "signicat_signer_id";--> statement-breakpoint
ALTER TABLE "signatures" DROP COLUMN "signicat_sign_url";
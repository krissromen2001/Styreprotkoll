ALTER TABLE "companies" ADD COLUMN "stripe_customer_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_subscription_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_subscription_status" varchar(100);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_price_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_current_period_end" timestamp;

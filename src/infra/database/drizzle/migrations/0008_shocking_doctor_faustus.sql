CREATE TYPE "public"."sale_channel" AS ENUM('in_store', 'online');--> statement-breakpoint
CREATE TYPE "public"."sale_payment_method" AS ENUM('pix', 'credit_card', 'debit_card', 'cash', 'other');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"client_id" text,
	"channel" "sale_channel" DEFAULT 'in_store' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" "sale_payment_method" NOT NULL,
	"status" "sale_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sales_tenant_status_idx" ON "sales" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "sales_tenant_client_idx" ON "sales" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "sales_tenant_created_idx" ON "sales" USING btree ("tenant_id","created_at");
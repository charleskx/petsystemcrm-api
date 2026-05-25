CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('unit', 'gram');--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"document" varchar(18),
	"email" varchar(255),
	"phone" varchar(20),
	"address_zip" varchar(10),
	"address_street" varchar(255),
	"address_city" varchar(100),
	"address_state" varchar(2),
	"contact_name" varchar(255),
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"supplier_id" text,
	"category_id" text,
	"name" varchar(255) NOT NULL,
	"barcode" varchar(100),
	"sku" varchar(100),
	"brand" varchar(100),
	"unit_type" "unit_type" NOT NULL,
	"cost_price" numeric(10, 2) NOT NULL,
	"margin_percent" numeric(5, 2) NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"expiry_date" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_tenant_active_idx" ON "products" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "products_tenant_stock_idx" ON "products" USING btree ("tenant_id","quantity","min_quantity");--> statement-breakpoint
CREATE INDEX "products_tenant_expiry_idx" ON "products" USING btree ("tenant_id","expiry_date");--> statement-breakpoint
CREATE INDEX "stock_movements_tenant_product_idx" ON "stock_movements" USING btree ("tenant_id","product_id");
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30) NOT NULL,
	"document" varchar(14),
	"address_zip" varchar(10) NOT NULL,
	"address_street" varchar(255) NOT NULL,
	"address_number" varchar(20) NOT NULL,
	"address_complement" varchar(100),
	"address_neighborhood" varchar(100) NOT NULL,
	"address_city" varchar(100) NOT NULL,
	"address_state" varchar(2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
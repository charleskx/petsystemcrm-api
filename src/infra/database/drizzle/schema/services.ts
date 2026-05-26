import { boolean, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { petSizeEnum } from "./pets"
import { tenants } from "./tenants"

export const services = pgTable("services", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	durationMinutes: integer("duration_minutes").notNull(),
	active: boolean("active").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const servicePricing = pgTable("service_pricing", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	serviceId: text("service_id")
		.notNull()
		.references(() => services.id, { onDelete: "cascade" }),
	petSize: petSizeEnum("pet_size").notNull(),
	price: numeric("price", { precision: 10, scale: 2 }).notNull(),
})

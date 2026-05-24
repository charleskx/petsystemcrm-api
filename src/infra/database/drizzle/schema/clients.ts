import { boolean, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const clients = pgTable("clients", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }),
	phone: varchar("phone", { length: 30 }).notNull(),
	document: varchar("document", { length: 14 }),
	addressZip: varchar("address_zip", { length: 10 }).notNull(),
	addressStreet: varchar("address_street", { length: 255 }).notNull(),
	addressNumber: varchar("address_number", { length: 20 }).notNull(),
	addressComplement: varchar("address_complement", { length: 100 }),
	addressNeighborhood: varchar("address_neighborhood", { length: 100 }).notNull(),
	addressCity: varchar("address_city", { length: 100 }).notNull(),
	addressState: varchar("address_state", { length: 2 }).notNull(),
	active: boolean("active").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})

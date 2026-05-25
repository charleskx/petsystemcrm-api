import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const suppliers = pgTable("suppliers", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
	document: varchar("document", { length: 18 }),
	email: varchar("email", { length: 255 }),
	phone: varchar("phone", { length: 20 }),
	addressZip: varchar("address_zip", { length: 10 }),
	addressStreet: varchar("address_street", { length: 255 }),
	addressCity: varchar("address_city", { length: 100 }),
	addressState: varchar("address_state", { length: 2 }),
	contactName: varchar("contact_name", { length: 255 }),
	active: boolean("active").notNull().default(true),
})

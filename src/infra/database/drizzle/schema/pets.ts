import { numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { clients } from "./clients"
import { tenants } from "./tenants"

export const petSizeEnum = pgEnum("pet_size", ["small", "medium", "large", "extra_large"])

export const pets = pgTable("pets", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	clientId: text("client_id")
		.notNull()
		.references(() => clients.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
	species: varchar("species", { length: 100 }).notNull(),
	breed: varchar("breed", { length: 100 }),
	birthDate: timestamp("birth_date"),
	weight: numeric("weight", { precision: 6, scale: 2 }),
	size: petSizeEnum("size"),
	notes: text("notes"),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})

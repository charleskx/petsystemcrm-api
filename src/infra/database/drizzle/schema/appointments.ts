import { numeric, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { clients } from "./clients"
import { pets } from "./pets"
import { services } from "./services"

export const appointmentStatusEnum = pgEnum("appointment_status", [
	"scheduled",
	"in_progress",
	"completed",
	"cancelled",
])

export const paymentMethodEnum = pgEnum("payment_method", [
	"pix",
	"credit_card",
	"debit_card",
	"cash",
	"other",
])

export const appointments = pgTable("appointments", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	clientId: text("client_id")
		.notNull()
		.references(() => clients.id, { onDelete: "cascade" }),
	petId: text("pet_id")
		.notNull()
		.references(() => pets.id, { onDelete: "cascade" }),
	status: appointmentStatusEnum("status").notNull().default("scheduled"),
	paymentMethod: paymentMethodEnum("payment_method").notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
	notes: text("notes"),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const appointmentServices = pgTable("appointment_services", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	appointmentId: text("appointment_id")
		.notNull()
		.references(() => appointments.id, { onDelete: "cascade" }),
	serviceId: text("service_id")
		.notNull()
		.references(() => services.id, { onDelete: "cascade" }),
	price: numeric("price", { precision: 10, scale: 2 }).notNull(),
})

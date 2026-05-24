import { boolean, date, pgTable, text, time, unique, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const workSchedules = pgTable(
	"work_schedules",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		dayOfWeek: text("day_of_week", { enum: ["0", "1", "2", "3", "4", "5", "6"] }).notNull(),
		openTime: time("open_time"),
		closeTime: time("close_time"),
		isClosed: boolean("is_closed").notNull().default(false),
	},
	(t) => [unique("work_schedules_tenant_day_unique").on(t.tenantId, t.dayOfWeek)],
)

export const holidays = pgTable("holidays", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	date: date("date").notNull(),
	description: varchar("description", { length: 255 }).notNull(),
})

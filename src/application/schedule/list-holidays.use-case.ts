import { asc, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { holidays } from "../../infra/database/drizzle/schema"
import type { HolidayProps } from "../../domain/schedule/holiday.entity"

export async function listHolidays(tenantId: string): Promise<HolidayProps[]> {
	const rows = await db
		.select()
		.from(holidays)
		.where(eq(holidays.tenantId, tenantId))
		.orderBy(asc(holidays.date))

	return rows as HolidayProps[]
}

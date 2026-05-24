import { eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { workSchedules } from "../../infra/database/drizzle/schema"
import type { WorkScheduleProps } from "../../domain/schedule/work-schedule.entity"

export async function getWorkSchedule(tenantId: string): Promise<WorkScheduleProps[]> {
	const rows = await db
		.select()
		.from(workSchedules)
		.where(eq(workSchedules.tenantId, tenantId))
		.orderBy(workSchedules.dayOfWeek)

	return rows as WorkScheduleProps[]
}

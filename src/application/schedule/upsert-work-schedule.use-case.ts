import { eq } from "drizzle-orm"
import type { DayOfWeek, WorkScheduleProps } from "../../domain/schedule/work-schedule.entity"
import { db } from "../../infra/database/drizzle/client"
import { workSchedules } from "../../infra/database/drizzle/schema"

export interface WorkScheduleInput {
	dayOfWeek: DayOfWeek
	openTime?: string | null
	closeTime?: string | null
	isClosed: boolean
}

export async function upsertWorkSchedule(
	tenantId: string,
	entries: WorkScheduleInput[],
): Promise<WorkScheduleProps[]> {
	const result = await db.transaction(async (tx) => {
		await tx.delete(workSchedules).where(eq(workSchedules.tenantId, tenantId))

		if (entries.length === 0) {
			return []
		}

		const rows = await tx
			.insert(workSchedules)
			.values(
				entries.map((e) => ({
					tenantId,
					dayOfWeek: e.dayOfWeek,
					openTime: e.openTime ?? null,
					closeTime: e.closeTime ?? null,
					isClosed: e.isClosed,
				})),
			)
			.returning()

		return rows
	})

	return result as WorkScheduleProps[]
}

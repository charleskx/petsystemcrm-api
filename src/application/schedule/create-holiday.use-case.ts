import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { holidays } from "../../infra/database/drizzle/schema"
import type { HolidayProps } from "../../domain/schedule/holiday.entity"

export class DuplicateHolidayError extends Error {
	constructor() {
		super("Já existe um feriado cadastrado nesta data")
		this.name = "DuplicateHolidayError"
	}
}

export interface CreateHolidayInput {
	tenantId: string
	date: string
	description: string
}

export async function createHoliday(input: CreateHolidayInput): Promise<HolidayProps> {
	const [existing] = await db
		.select({ id: holidays.id })
		.from(holidays)
		.where(and(eq(holidays.tenantId, input.tenantId), eq(holidays.date, input.date)))
		.limit(1)

	if (existing) {
		throw new DuplicateHolidayError()
	}

	const [holiday] = await db
		.insert(holidays)
		.values({
			tenantId: input.tenantId,
			date: input.date,
			description: input.description,
		})
		.returning()

	return holiday as HolidayProps
}

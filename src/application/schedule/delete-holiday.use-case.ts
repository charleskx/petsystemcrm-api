import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { holidays } from "../../infra/database/drizzle/schema"

export class HolidayNotFoundError extends Error {
	constructor() {
		super("Feriado não encontrado")
		this.name = "HolidayNotFoundError"
	}
}

export async function deleteHoliday(id: string, tenantId: string): Promise<void> {
	const [existing] = await db
		.select({ id: holidays.id })
		.from(holidays)
		.where(and(eq(holidays.id, id), eq(holidays.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new HolidayNotFoundError()
	}

	await db.delete(holidays).where(and(eq(holidays.id, id), eq(holidays.tenantId, tenantId)))
}

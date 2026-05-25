import { and, eq, gte, lt, inArray } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { appointments, holidays, workSchedules } from "../../infra/database/drizzle/schema"
import type { DayOfWeek } from "../../domain/schedule/work-schedule.entity"

export interface GetAvailableSlotsInput {
	tenantId: string
	date: string
	duration: number
}

function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(":").map(Number)
	return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export async function getAvailableSlots(input: GetAvailableSlotsInput): Promise<string[]> {
	const { tenantId, date, duration } = input

	const [holiday] = await db
		.select({ id: holidays.id })
		.from(holidays)
		.where(and(eq(holidays.tenantId, tenantId), eq(holidays.date, date)))
		.limit(1)

	if (holiday) {
		return []
	}

	const dayOfWeek = String(new Date(`${date}T00:00:00`).getDay()) as DayOfWeek

	const [schedule] = await db
		.select()
		.from(workSchedules)
		.where(and(eq(workSchedules.tenantId, tenantId), eq(workSchedules.dayOfWeek, dayOfWeek)))
		.limit(1)

	if (!schedule || schedule.isClosed || !schedule.openTime || !schedule.closeTime) {
		return []
	}

	const openMinutes = timeToMinutes(schedule.openTime)
	const closeMinutes = timeToMinutes(schedule.closeTime)
	const slots: string[] = []

	for (let start = openMinutes; start + duration <= closeMinutes; start += duration) {
		slots.push(minutesToTime(start))
	}

	const dayStart = new Date(`${date}T00:00:00.000Z`)
	const dayEnd = new Date(`${date}T23:59:59.999Z`)

	const bookedAppointments = await db
		.select({ scheduledAt: appointments.scheduledAt })
		.from(appointments)
		.where(
			and(
				eq(appointments.tenantId, tenantId),
				inArray(appointments.status, ["scheduled", "in_progress"]),
				gte(appointments.scheduledAt, dayStart),
				lt(appointments.scheduledAt, dayEnd),
			),
		)

	const bookedSlots = new Set(
		bookedAppointments.map((a) => {
			const h = String(a.scheduledAt.getUTCHours()).padStart(2, "0")
			const m = String(a.scheduledAt.getUTCMinutes()).padStart(2, "0")
			return `${h}:${m}`
		}),
	)

	return slots.filter((slot) => !bookedSlots.has(slot))
}

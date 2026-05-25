import { and, desc, eq, gte, lt } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { appointments } from "../../infra/database/drizzle/schema"
import type { AppointmentProps, AppointmentStatus } from "../../domain/appointment/appointment.entity"

export interface ListAppointmentsInput {
	tenantId: string
	date?: string
	status?: AppointmentStatus
	clientId?: string
	petId?: string
	page?: number
	limit?: number
}

export interface ListAppointmentsOutput {
	data: AppointmentProps[]
	total: number
	page: number
	limit: number
}

export async function listAppointments(input: ListAppointmentsInput): Promise<ListAppointmentsOutput> {
	const { tenantId, date, status, clientId, petId } = input
	const page = input.page ?? 1
	const limit = input.limit ?? 20
	const offset = (page - 1) * limit

	const conditions = [eq(appointments.tenantId, tenantId)]

	if (status) {
		conditions.push(eq(appointments.status, status))
	}

	if (clientId) {
		conditions.push(eq(appointments.clientId, clientId))
	}

	if (petId) {
		conditions.push(eq(appointments.petId, petId))
	}

	if (date) {
		const dayStart = new Date(`${date}T00:00:00.000Z`)
		const dayEnd = new Date(`${date}T23:59:59.999Z`)
		conditions.push(gte(appointments.scheduledAt, dayStart))
		conditions.push(lt(appointments.scheduledAt, dayEnd))
	}

	const rows = await db
		.select()
		.from(appointments)
		.where(and(...conditions))
		.orderBy(desc(appointments.scheduledAt))
		.limit(limit)
		.offset(offset)

	const all = await db
		.select({ id: appointments.id })
		.from(appointments)
		.where(and(...conditions))

	return {
		data: rows as AppointmentProps[],
		total: all.length,
		page,
		limit,
	}
}

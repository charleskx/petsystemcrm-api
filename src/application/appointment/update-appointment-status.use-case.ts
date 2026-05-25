import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { appointments } from "../../infra/database/drizzle/schema"
import type { AppointmentProps, AppointmentStatus } from "../../domain/appointment/appointment.entity"
import { AppointmentNotFoundError } from "./get-appointment.use-case"

export class InvalidStatusTransitionError extends Error {
	constructor(from: string, to: string) {
		super(`Transição de status inválida: ${from} → ${to}`)
	}
}

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
	scheduled: ["in_progress"],
	in_progress: ["completed"],
	completed: [],
	cancelled: [],
}

export interface UpdateAppointmentStatusInput {
	id: string
	tenantId: string
	status: AppointmentStatus
}

export async function updateAppointmentStatus(input: UpdateAppointmentStatusInput): Promise<AppointmentProps> {
	const { id, tenantId, status } = input

	const [appointment] = await db
		.select()
		.from(appointments)
		.where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
		.limit(1)

	if (!appointment) {
		throw new AppointmentNotFoundError()
	}

	const allowedTransitions = VALID_TRANSITIONS[appointment.status as AppointmentStatus] ?? []
	if (!allowedTransitions.includes(status)) {
		throw new InvalidStatusTransitionError(appointment.status, status)
	}

	const [updated] = await db
		.update(appointments)
		.set({ status })
		.where(eq(appointments.id, id))
		.returning()

	return updated as AppointmentProps
}

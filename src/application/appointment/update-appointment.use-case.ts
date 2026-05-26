import { and, eq } from "drizzle-orm"
import type { AppointmentProps, PaymentMethod } from "../../domain/appointment/appointment.entity"
import { db } from "../../infra/database/drizzle/client"
import { appointments } from "../../infra/database/drizzle/schema"
import { AppointmentNotFoundError } from "./get-appointment.use-case"

export class AppointmentCancelledError extends Error {
	constructor() {
		super("Agendamentos cancelados não podem ser editados")
	}
}

export interface UpdateAppointmentInput {
	id: string
	tenantId: string
	notes?: string
	paymentMethod?: PaymentMethod
}

export async function updateAppointment(input: UpdateAppointmentInput): Promise<AppointmentProps> {
	const { id, tenantId, notes, paymentMethod } = input

	const [appointment] = await db
		.select()
		.from(appointments)
		.where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
		.limit(1)

	if (!appointment) {
		throw new AppointmentNotFoundError()
	}

	if (appointment.status === "cancelled") {
		throw new AppointmentCancelledError()
	}

	const updates: Partial<{ notes: string | null; paymentMethod: PaymentMethod }> = {}
	if (notes !== undefined) updates.notes = notes
	if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod

	const [updated] = await db
		.update(appointments)
		.set(updates)
		.where(eq(appointments.id, id))
		.returning()

	return updated as AppointmentProps
}

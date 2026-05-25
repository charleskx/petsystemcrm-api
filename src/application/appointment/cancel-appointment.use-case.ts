import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { appointments } from "../../infra/database/drizzle/schema"
import { AppointmentNotFoundError } from "./get-appointment.use-case"

export class AppointmentAlreadyCancelledError extends Error {
	constructor() {
		super("Agendamento já está cancelado")
	}
}

export class AppointmentCompletedError extends Error {
	constructor() {
		super("Agendamentos concluídos não podem ser cancelados")
	}
}

export async function cancelAppointment(id: string, tenantId: string): Promise<void> {
	const [appointment] = await db
		.select()
		.from(appointments)
		.where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
		.limit(1)

	if (!appointment) {
		throw new AppointmentNotFoundError()
	}

	if (appointment.status === "cancelled") {
		throw new AppointmentAlreadyCancelledError()
	}

	if (appointment.status === "completed") {
		throw new AppointmentCompletedError()
	}

	await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, id))
}

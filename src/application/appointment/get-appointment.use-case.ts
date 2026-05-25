import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { appointments, appointmentServices, clients, pets, services } from "../../infra/database/drizzle/schema"
import type { AppointmentProps } from "../../domain/appointment/appointment.entity"

export class AppointmentNotFoundError extends Error {
	constructor() {
		super("Agendamento não encontrado")
	}
}

export interface AppointmentDetail extends AppointmentProps {
	client: { id: string; name: string; phone: string }
	pet: { id: string; name: string; species: string }
	services: { serviceId: string; name: string; price: string; durationMinutes: number }[]
}

export async function getAppointment(id: string, tenantId: string): Promise<AppointmentDetail> {
	const [appointment] = await db
		.select()
		.from(appointments)
		.where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
		.limit(1)

	if (!appointment) {
		throw new AppointmentNotFoundError()
	}

	const [client] = await db
		.select({ id: clients.id, name: clients.name, phone: clients.phone })
		.from(clients)
		.where(eq(clients.id, appointment.clientId))
		.limit(1)

	const [pet] = await db
		.select({ id: pets.id, name: pets.name, species: pets.species })
		.from(pets)
		.where(eq(pets.id, appointment.petId))
		.limit(1)

	const apptServiceRows = await db
		.select({
			serviceId: appointmentServices.serviceId,
			price: appointmentServices.price,
			name: services.name,
			durationMinutes: services.durationMinutes,
		})
		.from(appointmentServices)
		.innerJoin(services, eq(services.id, appointmentServices.serviceId))
		.where(eq(appointmentServices.appointmentId, id))

	return {
		...(appointment as AppointmentProps),
		client: client as { id: string; name: string; phone: string },
		pet: pet as { id: string; name: string; species: string },
		services: apptServiceRows,
	}
}

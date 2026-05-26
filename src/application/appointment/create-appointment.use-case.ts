import { and, eq, inArray } from "drizzle-orm"
import type { AppointmentProps, PaymentMethod } from "../../domain/appointment/appointment.entity"
import { db } from "../../infra/database/drizzle/client"
import {
	appointmentServices,
	appointments,
	clients,
	pets,
	servicePricing,
	services,
} from "../../infra/database/drizzle/schema"
import { getAvailableSlots } from "../schedule/get-available-slots.use-case"

export class SlotUnavailableError extends Error {
	constructor() {
		super("Horário não disponível para agendamento")
	}
}

export class MissingPricingError extends Error {
	constructor(serviceId: string) {
		super(`Serviço '${serviceId}' não possui precificação para o porte do pet`)
	}
}

export class ClientNotFoundError extends Error {
	constructor() {
		super("Cliente não encontrado")
	}
}

export class PetMismatchError extends Error {
	constructor() {
		super("Pet não pertence ao cliente informado")
	}
}

export interface CreateAppointmentInput {
	tenantId: string
	clientId: string
	petId: string
	scheduledAt: Date
	paymentMethod: PaymentMethod
	serviceIds: string[]
	notes?: string
}

export async function createAppointment(
	input: CreateAppointmentInput,
): Promise<AppointmentProps & { services: { serviceId: string; price: string }[] }> {
	const { tenantId, clientId, petId, scheduledAt, paymentMethod, serviceIds, notes } = input

	const [client] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
		.limit(1)

	if (!client) {
		throw new ClientNotFoundError()
	}

	const [pet] = await db
		.select({ id: pets.id, clientId: pets.clientId, size: pets.size })
		.from(pets)
		.where(and(eq(pets.id, petId), eq(pets.tenantId, tenantId)))
		.limit(1)

	if (!pet || pet.clientId !== clientId) {
		throw new PetMismatchError()
	}

	const serviceRows = await db
		.select({ id: services.id, durationMinutes: services.durationMinutes })
		.from(services)
		.where(and(inArray(services.id, serviceIds), eq(services.tenantId, tenantId)))

	const totalDuration = serviceRows.reduce((sum, s) => sum + s.durationMinutes, 0)

	const date = scheduledAt.toISOString().slice(0, 10)
	const requestedTime = `${String(scheduledAt.getUTCHours()).padStart(2, "0")}:${String(scheduledAt.getUTCMinutes()).padStart(2, "0")}`

	const availableSlots = await getAvailableSlots({ tenantId, date, duration: totalDuration })

	if (!availableSlots.includes(requestedTime)) {
		throw new SlotUnavailableError()
	}

	const pricingRows = await db
		.select({
			serviceId: servicePricing.serviceId,
			petSize: servicePricing.petSize,
			price: servicePricing.price,
		})
		.from(servicePricing)
		.where(inArray(servicePricing.serviceId, serviceIds))

	const resolvedPrices: { serviceId: string; price: string }[] = []

	for (const serviceId of serviceIds) {
		const pricing = pricingRows.find((p) => p.serviceId === serviceId && p.petSize === pet.size)
		if (!pricing) {
			throw new MissingPricingError(serviceId)
		}
		resolvedPrices.push({ serviceId, price: pricing.price })
	}

	const totalAmount = resolvedPrices
		.reduce((sum, p) => sum + Number.parseFloat(p.price), 0)
		.toFixed(2)

	const [appointment] = await db
		.insert(appointments)
		.values({
			tenantId,
			clientId,
			petId,
			status: "scheduled",
			paymentMethod,
			totalAmount,
			notes: notes ?? null,
			scheduledAt,
		})
		.returning()

	await db.insert(appointmentServices).values(
		resolvedPrices.map((p) => ({
			appointmentId: appointment.id,
			serviceId: p.serviceId,
			price: p.price,
		})),
	)

	return { ...(appointment as AppointmentProps), services: resolvedPrices }
}

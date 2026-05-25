import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import {
	createAppointment,
	SlotUnavailableError,
	MissingPricingError,
	ClientNotFoundError,
	PetMismatchError,
} from "../../../application/appointment/create-appointment.use-case"
import { listAppointments } from "../../../application/appointment/list-appointments.use-case"
import { getAppointment, AppointmentNotFoundError } from "../../../application/appointment/get-appointment.use-case"
import { updateAppointment, AppointmentCancelledError } from "../../../application/appointment/update-appointment.use-case"
import {
	updateAppointmentStatus,
	InvalidStatusTransitionError,
} from "../../../application/appointment/update-appointment-status.use-case"
import {
	cancelAppointment,
	AppointmentAlreadyCancelledError,
	AppointmentCompletedError,
} from "../../../application/appointment/cancel-appointment.use-case"

const preHandler = [authenticate, subscriptionGuard]

const paymentMethodEnum = z.enum(["pix", "credit_card", "debit_card", "cash", "other"])
const appointmentStatusEnum = z.enum(["scheduled", "in_progress", "completed", "cancelled"])

const createAppointmentBody = z.object({
	clientId: z.string().min(1),
	petId: z.string().min(1),
	scheduledAt: z.string().datetime({ local: false }),
	paymentMethod: paymentMethodEnum,
	serviceIds: z.array(z.string().min(1)).min(1, "Informe ao menos um serviço"),
	notes: z.string().optional(),
})

const updateAppointmentBody = z.object({
	notes: z.string().optional(),
	paymentMethod: paymentMethodEnum.optional(),
})

const updateStatusBody = z.object({
	status: z.enum(["in_progress", "completed"]),
})

const listQuerySchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	status: appointmentStatusEnum.optional(),
	clientId: z.string().optional(),
	petId: z.string().optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function appointmentsRoutes(app: FastifyInstance) {
	app.post("/appointments", { preHandler }, async (request, reply) => {
		const result = createAppointmentBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		const { scheduledAt, ...rest } = result.data

		try {
			const appointment = await createAppointment({
				tenantId: request.tenantId,
				...rest,
				scheduledAt: new Date(scheduledAt),
			})
			return reply.status(201).send(appointment)
		} catch (error) {
			if (error instanceof ClientNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof PetMismatchError) {
				return reply.status(422).send({ error: error.message })
			}
			if (error instanceof SlotUnavailableError) {
				return reply.status(422).send({ error: error.message })
			}
			if (error instanceof MissingPricingError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.get("/appointments", { preHandler }, async (request, reply) => {
		const result = listQuerySchema.safeParse(request.query)
		if (!result.success) {
			return reply.status(422).send({ error: "Parâmetros inválidos", details: z.treeifyError(result.error) })
		}

		const { data } = result
		const appointmentsList = await listAppointments({
			tenantId: request.tenantId,
			date: data.date,
			status: data.status,
			clientId: data.clientId,
			petId: data.petId,
			page: data.page,
			limit: data.limit,
		})
		return reply.send(appointmentsList)
	})

	app.get("/appointments/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			const appointment = await getAppointment(id, request.tenantId)
			return reply.send(appointment)
		} catch (error) {
			if (error instanceof AppointmentNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.patch("/appointments/:id", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
			return reply.status(403).send({ error: "Sem permissão para atualizar agendamentos" })
		}

		const { id } = request.params as { id: string }
		const result = updateAppointmentBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		try {
			const appointment = await updateAppointment({ id, tenantId: request.tenantId, ...result.data })
			return reply.send(appointment)
		} catch (error) {
			if (error instanceof AppointmentNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof AppointmentCancelledError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.patch("/appointments/:id/status", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
			return reply.status(403).send({ error: "Sem permissão para alterar status de agendamentos" })
		}

		const { id } = request.params as { id: string }
		const result = updateStatusBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		try {
			const appointment = await updateAppointmentStatus({ id, tenantId: request.tenantId, status: result.data.status })
			return reply.send(appointment)
		} catch (error) {
			if (error instanceof AppointmentNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof InvalidStatusTransitionError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.delete("/appointments/:id", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
			return reply.status(403).send({ error: "Sem permissão para cancelar agendamentos" })
		}

		const { id } = request.params as { id: string }
		try {
			await cancelAppointment(id, request.tenantId)
			return reply.status(204).send()
		} catch (error) {
			if (error instanceof AppointmentNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof AppointmentAlreadyCancelledError) {
				return reply.status(422).send({ error: error.message })
			}
			if (error instanceof AppointmentCompletedError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})
}

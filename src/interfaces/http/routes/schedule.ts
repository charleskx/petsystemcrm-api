import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import { getWorkSchedule } from "../../../application/schedule/get-work-schedule.use-case"
import { upsertWorkSchedule } from "../../../application/schedule/upsert-work-schedule.use-case"
import { listHolidays } from "../../../application/schedule/list-holidays.use-case"
import { createHoliday, DuplicateHolidayError } from "../../../application/schedule/create-holiday.use-case"
import { deleteHoliday, HolidayNotFoundError } from "../../../application/schedule/delete-holiday.use-case"
import { getAvailableSlots } from "../../../application/schedule/get-available-slots.use-case"
import {
	errorSchema,
	notFoundSchema,
	unauthorizedSchema,
	forbiddenSchema,
	unprocessableSchema,
	paymentRequiredSchema,
} from "../schemas/shared"

const preHandler = [authenticate, subscriptionGuard]

const dayOfWeekEnum = z.enum(["0", "1", "2", "3", "4", "5", "6"])

const workScheduleEntrySchema = z
	.object({
		dayOfWeek: dayOfWeekEnum,
		openTime: z
			.string()
			.regex(/^\d{2}:\d{2}$/)
			.optional()
			.nullable(),
		closeTime: z
			.string()
			.regex(/^\d{2}:\d{2}$/)
			.optional()
			.nullable(),
		isClosed: z.boolean(),
	})
	.refine(
		(e) => {
			if (!e.isClosed && e.openTime && e.closeTime) {
				return e.openTime < e.closeTime
			}
			return true
		},
		{ message: "openTime deve ser anterior a closeTime" },
	)

const upsertScheduleBody = z
	.array(workScheduleEntrySchema)
	.refine((arr) => new Set(arr.map((e) => e.dayOfWeek)).size === arr.length, {
		message: "Cada dia da semana deve aparecer apenas uma vez",
	})

const createHolidayBody = z.object({
	date: z.iso.date(),
	description: z.string().min(1).max(255),
})

const availableSlotsQuery = z.object({
	date: z.iso.date(),
	duration: z.coerce.number().int().min(1),
})

export async function scheduleRoutes(app: FastifyInstance) {
	app.get(
		"/schedule",
		{
			preHandler,
			schema: {
				tags: ["Schedule"],
				summary: "Get work schedule",
				security: [{ cookieAuth: [] }],
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
				},
			},
		},
		async (request, reply) => {
			const schedule = await getWorkSchedule(request.tenantId)
			return reply.send(schedule)
		},
	)

	app.put(
		"/schedule",
		{
			preHandler,
			schema: {
				tags: ["Schedule"],
				summary: "Update work schedule",
				security: [{ cookieAuth: [] }],
				body: {
					type: "array",
					items: {
						type: "object",
						properties: {
							dayOfWeek: { type: "string" },
							openTime: { type: ["string", "null"] },
							closeTime: { type: ["string", "null"] },
							isClosed: { type: "boolean" },
						},
					},
				},
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("update", "WorkSchedule")) {
				return reply.status(403).send({ error: "Sem permissão para alterar a grade horária" })
			}

			const result = upsertScheduleBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			const schedule = await upsertWorkSchedule(request.tenantId, result.data)
			return reply.send(schedule)
		},
	)

	app.get(
		"/schedule/holidays",
		{
			preHandler,
			schema: {
				tags: ["Schedule"],
				summary: "List holidays",
				security: [{ cookieAuth: [] }],
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
				},
			},
		},
		async (request, reply) => {
			const holidayList = await listHolidays(request.tenantId)
			return reply.send(holidayList)
		},
	)

	app.post(
		"/schedule/holidays",
		{
			preHandler,
			schema: {
				tags: ["Schedule"],
				summary: "Create holiday",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						date: { type: "string" },
						description: { type: "string" },
					},
				},
				response: {
					201: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					409: errorSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("create", "Holiday")) {
				return reply.status(403).send({ error: "Sem permissão para cadastrar feriados" })
			}

			const result = createHolidayBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const holiday = await createHoliday({ tenantId: request.tenantId, ...result.data })
				return reply.status(201).send(holiday)
			} catch (error) {
				if (error instanceof DuplicateHolidayError) {
					return reply.status(409).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.delete(
		"/schedule/holidays/:id",
		{
			preHandler,
			schema: {
				tags: ["Schedule"],
				summary: "Delete holiday",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				response: {
					204: { type: "null" },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("delete", "Holiday")) {
				return reply.status(403).send({ error: "Sem permissão para remover feriados" })
			}

			const { id } = request.params as { id: string }
			try {
				await deleteHoliday(id, request.tenantId)
				return reply.status(204).send()
			} catch (error) {
				if (error instanceof HolidayNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.get(
		"/schedule/available-slots",
		{
			preHandler,
			schema: {
				tags: ["Schedule"],
				summary: "Get available slots",
				security: [{ cookieAuth: [] }],
				querystring: {
					type: "object",
					properties: {
						date: { type: "string" },
						duration: { type: "integer" },
					},
				},
				response: {
					200: { type: "array", items: { type: "string" } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const result = availableSlotsQuery.safeParse(request.query)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			const slots = await getAvailableSlots({
				tenantId: request.tenantId,
				date: result.data.date,
				duration: result.data.duration,
			})
			return reply.send(slots)
		},
	)
}

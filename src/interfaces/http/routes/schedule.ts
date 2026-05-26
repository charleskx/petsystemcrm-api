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
	app.get("/schedule", { preHandler }, async (request, reply) => {
		const schedule = await getWorkSchedule(request.tenantId)
		return reply.send(schedule)
	})

	app.put("/schedule", { preHandler }, async (request, reply) => {
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
	})

	app.get("/schedule/holidays", { preHandler }, async (request, reply) => {
		const holidayList = await listHolidays(request.tenantId)
		return reply.send(holidayList)
	})

	app.post("/schedule/holidays", { preHandler }, async (request, reply) => {
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
	})

	app.delete("/schedule/holidays/:id", { preHandler }, async (request, reply) => {
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
	})

	app.get("/schedule/available-slots", { preHandler }, async (request, reply) => {
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
	})
}

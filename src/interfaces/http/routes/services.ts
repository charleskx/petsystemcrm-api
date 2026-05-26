import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { createService } from "../../../application/service/create-service.use-case"
import { deleteService } from "../../../application/service/delete-service.use-case"
import { getService, ServiceNotFoundError } from "../../../application/service/get-service.use-case"
import { getServicePricing } from "../../../application/service/get-service-pricing.use-case"
import { listServices } from "../../../application/service/list-services.use-case"
import { updateService } from "../../../application/service/update-service.use-case"
import {
	DuplicatePetSizeError,
	updateServicePricing,
} from "../../../application/service/update-service-pricing.use-case"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import {
	forbiddenSchema,
	notFoundSchema,
	paymentRequiredSchema,
	unauthorizedSchema,
	unprocessableSchema,
} from "../schemas/shared"

const preHandler = [authenticate, subscriptionGuard]

const petSizeEnum = z.enum(["small", "medium", "large", "extra_large"])

const createServiceBody = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	durationMinutes: z.number().int().min(1),
	active: z.boolean().optional(),
})

const updateServiceBody = createServiceBody.partial()

const pricingTierSchema = z.object({
	petSize: petSizeEnum,
	price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço inválido"),
})

const updatePricingBody = z.array(pricingTierSchema).min(1, "Informe ao menos uma faixa de preço")

export async function servicesRoutes(app: FastifyInstance) {
	app.post(
		"/services",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "Create service",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						description: { type: "string" },
						durationMinutes: { type: "integer" },
						active: { type: "boolean" },
					},
				},
				response: {
					201: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("create", "Service")) {
				return reply.status(403).send({ error: "Sem permissão para criar serviços" })
			}

			const result = createServiceBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			const service = await createService({ tenantId: request.tenantId, ...result.data })
			return reply.status(201).send(service)
		},
	)

	app.get(
		"/services",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "List services",
				security: [{ cookieAuth: [] }],
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
				},
			},
		},
		async (request, reply) => {
			const servicesList = await listServices(request.tenantId)
			return reply.send(servicesList)
		},
	)

	app.get(
		"/services/:id",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "Get service",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					404: notFoundSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string }
			try {
				const service = await getService(id, request.tenantId)
				return reply.send(service)
			} catch (error) {
				if (error instanceof ServiceNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.patch(
		"/services/:id",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "Update service",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						description: { type: "string" },
						durationMinutes: { type: "integer" },
						active: { type: "boolean" },
					},
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("update", "Service")) {
				return reply.status(403).send({ error: "Sem permissão para atualizar serviços" })
			}

			const { id } = request.params as { id: string }
			const result = updateServiceBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const service = await updateService({ id, tenantId: request.tenantId, ...result.data })
				return reply.send(service)
			} catch (error) {
				if (error instanceof ServiceNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.delete(
		"/services/:id",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "Delete service",
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
			if (request.ability.cannot("delete", "Service")) {
				return reply.status(403).send({ error: "Sem permissão para remover serviços" })
			}

			const { id } = request.params as { id: string }
			try {
				await deleteService(id, request.tenantId)
				return reply.status(204).send()
			} catch (error) {
				if (error instanceof ServiceNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.get(
		"/services/:id/pricing",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "Get service pricing",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					404: notFoundSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string }
			try {
				const pricing = await getServicePricing(id, request.tenantId)
				return reply.send(pricing)
			} catch (error) {
				if (error instanceof ServiceNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.put(
		"/services/:id/pricing",
		{
			preHandler,
			schema: {
				tags: ["Services"],
				summary: "Update service pricing",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				body: {
					type: "array",
					items: {
						type: "object",
						properties: {
							petSize: { type: "string" },
							price: { type: "string" },
						},
					},
				},
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("update", "ServicePricing")) {
				return reply.status(403).send({ error: "Sem permissão para atualizar preços" })
			}

			const { id } = request.params as { id: string }
			const result = updatePricingBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const pricing = await updateServicePricing(id, request.tenantId, result.data)
				return reply.send(pricing)
			} catch (error) {
				if (error instanceof ServiceNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (error instanceof DuplicatePetSizeError) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)
}

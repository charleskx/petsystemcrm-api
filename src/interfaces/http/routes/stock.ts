import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import {
	createStockMovement,
	ProductNotFoundError,
	ProductInactiveError,
	InsufficientStockError,
} from "../../../application/product/create-stock-movement.use-case"
import { listStockMovements } from "../../../application/product/list-stock-movements.use-case"
import {
	notFoundSchema,
	unauthorizedSchema,
	forbiddenSchema,
	unprocessableSchema,
	paymentRequiredSchema,
} from "../schemas/shared"

const preHandler = [authenticate, subscriptionGuard]

const createMovementBody = z.object({
	productId: z.string().min(1),
	type: z.enum(["in", "out"]),
	quantity: z.number().int().min(1),
	reason: z.string().min(1),
	referenceId: z.string().optional(),
})

const listMovementsQuery = z.object({
	productId: z.string().optional(),
	type: z.enum(["in", "out"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function stockRoutes(app: FastifyInstance) {
	app.post(
		"/stock/movements",
		{
			preHandler,
			schema: {
				tags: ["Stock"],
				summary: "Create stock movement",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						productId: { type: "string" },
						type: { type: "string" },
						quantity: { type: "integer" },
						reason: { type: "string" },
						referenceId: { type: "string" },
					},
				},
				response: {
					201: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("create", "StockMovement")) {
				return reply.status(403).send({ error: "Sem permissão para registrar movimentações de estoque" })
			}

			const result = createMovementBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
			}

			try {
				const output = await createStockMovement({ tenantId: request.tenantId, ...result.data })
				return reply.status(201).send(output)
			} catch (error) {
				if (error instanceof ProductNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (error instanceof ProductInactiveError || error instanceof InsufficientStockError) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.get(
		"/stock/movements",
		{
			preHandler,
			schema: {
				tags: ["Stock"],
				summary: "List stock movements",
				security: [{ cookieAuth: [] }],
				querystring: {
					type: "object",
					properties: {
						productId: { type: "string" },
						type: { type: "string" },
						page: { type: "integer" },
						limit: { type: "integer" },
					},
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const result = listMovementsQuery.safeParse(request.query)
			if (!result.success) {
				return reply.status(422).send({ error: "Parâmetros inválidos", details: z.treeifyError(result.error) })
			}

			const movements = await listStockMovements({ tenantId: request.tenantId, ...result.data })
			return reply.send(movements)
		},
	)
}

import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import { premiumGuard } from "../middlewares/premium-guard"
import { createSale, ProductNotFoundError, ProductInactiveError, InsufficientStockError } from "../../../application/sale/create-sale.use-case"
import { listSales } from "../../../application/sale/list-sales.use-case"
import { getSale, SaleNotFoundError } from "../../../application/sale/get-sale.use-case"
import { updateSaleStatus, InvalidSaleStatusTransitionError, SaleNotFoundError as UpdateSaleNotFoundError } from "../../../application/sale/update-sale-status.use-case"

const preHandler = [authenticate, subscriptionGuard, premiumGuard]

const createSaleBody = z.object({
	clientId: z.string().optional(),
	channel: z.enum(["in_store", "online"]).optional(),
	paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "other"]),
	items: z
		.array(
			z.object({
				productId: z.string().min(1),
				quantity: z.int().min(1),
			}),
		)
		.min(1, "A venda deve ter ao menos um item"),
})

const updateSaleStatusBody = z.object({
	status: z.enum(["paid", "cancelled"]),
})

const listSalesQuery = z.object({
	clientId: z.string().optional(),
	status: z.enum(["pending", "paid", "cancelled"]).optional(),
	from: z.iso.datetime().optional(),
	to: z.iso.datetime().optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function salesRoutes(app: FastifyInstance) {
	app.get("/sales", { preHandler }, async (request, reply) => {
		const result = listSalesQuery.safeParse(request.query)
		if (!result.success) {
			return reply.status(422).send({ error: "Parâmetros inválidos", details: z.treeifyError(result.error) })
		}

		const { from, to, ...rest } = result.data
		const output = await listSales({
			tenantId: request.tenantId,
			...rest,
			from: from ? new Date(from) : undefined,
			to: to ? new Date(to) : undefined,
		})
		return reply.send(output)
	})

	app.post("/sales", { preHandler }, async (request, reply) => {
		if (request.ability.cannot("create", "Sale")) {
			return reply.status(403).send({ error: "Sem permissão para registrar vendas" })
		}

		const result = createSaleBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		try {
			const output = await createSale({ tenantId: request.tenantId, ...result.data })
			return reply.status(201).send(output)
		} catch (error) {
			if (error instanceof ProductNotFoundError || error instanceof ProductInactiveError) {
				return reply.status(422).send({ error: error.message })
			}
			if (error instanceof InsufficientStockError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.get("/sales/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }

		try {
			const output = await getSale(id, request.tenantId)
			return reply.send(output)
		} catch (error) {
			if (error instanceof SaleNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.patch("/sales/:id/status", { preHandler }, async (request, reply) => {
		if (request.ability.cannot("update", "Sale")) {
			return reply.status(403).send({ error: "Sem permissão para alterar o status da venda" })
		}

		const { id } = request.params as { id: string }
		const result = updateSaleStatusBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		try {
			const sale = await updateSaleStatus(id, request.tenantId, result.data.status)
			return reply.send(sale)
		} catch (error) {
			if (error instanceof UpdateSaleNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof InvalidSaleStatusTransitionError) {
				return reply.status(409).send({ error: error.message })
			}
			throw error
		}
	})
}

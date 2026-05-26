import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import { premiumGuard } from "../middlewares/premium-guard"
import { listSuppliers } from "../../../application/supplier/list-suppliers.use-case"
import { createSupplier, InvalidDocumentError } from "../../../application/supplier/create-supplier.use-case"
import { getSupplier, SupplierNotFoundError } from "../../../application/supplier/get-supplier.use-case"
import { updateSupplier } from "../../../application/supplier/update-supplier.use-case"
import {
	deactivateSupplier,
	SupplierAlreadyInactiveError,
} from "../../../application/supplier/deactivate-supplier.use-case"

const preHandler = [authenticate, subscriptionGuard, premiumGuard]

const createSupplierBody = z.object({
	name: z.string().min(1).max(255),
	document: z.string().max(18).optional(),
	email: z.email().optional(),
	phone: z.string().max(20).optional(),
	addressZip: z.string().max(10).optional(),
	addressStreet: z.string().max(255).optional(),
	addressCity: z.string().max(100).optional(),
	addressState: z.string().length(2).optional(),
	contactName: z.string().max(255).optional(),
})

const updateSupplierBody = z.object({
	name: z.string().min(1).max(255).optional(),
	document: z.string().max(18).nullable().optional(),
	email: z.email().nullable().optional(),
	phone: z.string().max(20).nullable().optional(),
	addressZip: z.string().max(10).nullable().optional(),
	addressStreet: z.string().max(255).nullable().optional(),
	addressCity: z.string().max(100).nullable().optional(),
	addressState: z.string().length(2).nullable().optional(),
	contactName: z.string().max(255).nullable().optional(),
})

const listSuppliersQuery = z.object({
	active: z
		.string()
		.transform((v) => v !== "false")
		.optional(),
	name: z.string().optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function suppliersRoutes(app: FastifyInstance) {
	app.get("/suppliers", { preHandler }, async (request, reply) => {
		const result = listSuppliersQuery.safeParse(request.query)
		if (!result.success) {
			return reply.status(422).send({ error: "Parâmetros inválidos", details: z.treeifyError(result.error) })
		}

		const output = await listSuppliers({ tenantId: request.tenantId, ...result.data })
		return reply.send(output)
	})

	app.post("/suppliers", { preHandler }, async (request, reply) => {
		if (request.ability.cannot("create", "Supplier")) {
			return reply.status(403).send({ error: "Sem permissão para cadastrar fornecedores" })
		}

		const result = createSupplierBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		try {
			const supplier = await createSupplier({ tenantId: request.tenantId, ...result.data })
			return reply.status(201).send(supplier)
		} catch (error) {
			if (error instanceof InvalidDocumentError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.get("/suppliers/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			const supplier = await getSupplier(id, request.tenantId)
			return reply.send(supplier)
		} catch (error) {
			if (error instanceof SupplierNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.patch("/suppliers/:id", { preHandler }, async (request, reply) => {
		if (request.ability.cannot("update", "Supplier")) {
			return reply.status(403).send({ error: "Sem permissão para atualizar fornecedores" })
		}

		const { id } = request.params as { id: string }
		const result = updateSupplierBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
		}

		try {
			const supplier = await updateSupplier({ id, tenantId: request.tenantId, ...result.data })
			return reply.send(supplier)
		} catch (error) {
			if (error instanceof SupplierNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof InvalidDocumentError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.delete("/suppliers/:id", { preHandler }, async (request, reply) => {
		if (request.ability.cannot("delete", "Supplier")) {
			return reply.status(403).send({ error: "Sem permissão para remover fornecedores" })
		}

		const { id } = request.params as { id: string }
		try {
			await deactivateSupplier(id, request.tenantId)
			return reply.status(204).send()
		} catch (error) {
			if (error instanceof SupplierNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof SupplierAlreadyInactiveError) {
				return reply.status(409).send({ error: error.message })
			}
			throw error
		}
	})
}

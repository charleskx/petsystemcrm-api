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
import {
	errorSchema,
	notFoundSchema,
	unauthorizedSchema,
	forbiddenSchema,
	unprocessableSchema,
	paymentRequiredSchema,
} from "../schemas/shared"

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
	app.get(
		"/suppliers",
		{
			preHandler,
			schema: {
				tags: ["Suppliers"],
				summary: "List suppliers",
				security: [{ cookieAuth: [] }],
				querystring: {
					type: "object",
					properties: {
						active: { type: "string" },
						name: { type: "string" },
						page: { type: "integer", minimum: 1 },
						limit: { type: "integer", minimum: 1, maximum: 100 },
					},
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const result = listSuppliersQuery.safeParse(request.query)
			if (!result.success) {
				return reply.status(422).send({ error: "Parâmetros inválidos", details: z.treeifyError(result.error) })
			}

			const output = await listSuppliers({ tenantId: request.tenantId, ...result.data })
			return reply.send(output)
		},
	)

	app.post(
		"/suppliers",
		{
			preHandler,
			schema: {
				tags: ["Suppliers"],
				summary: "Create supplier",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						document: { type: "string" },
						email: { type: "string" },
						phone: { type: "string" },
						addressZip: { type: "string" },
						addressStreet: { type: "string" },
						addressCity: { type: "string" },
						addressState: { type: "string" },
						contactName: { type: "string" },
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
		},
	)

	app.get(
		"/suppliers/:id",
		{
			preHandler,
			schema: {
				tags: ["Suppliers"],
				summary: "Get supplier",
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
					403: forbiddenSchema,
					404: notFoundSchema,
				},
			},
		},
		async (request, reply) => {
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
		},
	)

	app.patch(
		"/suppliers/:id",
		{
			preHandler,
			schema: {
				tags: ["Suppliers"],
				summary: "Update supplier",
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
						document: { type: ["string", "null"] },
						email: { type: ["string", "null"] },
						phone: { type: ["string", "null"] },
						addressZip: { type: ["string", "null"] },
						addressStreet: { type: ["string", "null"] },
						addressCity: { type: ["string", "null"] },
						addressState: { type: ["string", "null"] },
						contactName: { type: ["string", "null"] },
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
		},
	)

	app.delete(
		"/suppliers/:id",
		{
			preHandler,
			schema: {
				tags: ["Suppliers"],
				summary: "Deactivate supplier",
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
					409: errorSchema,
				},
			},
		},
		async (request, reply) => {
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
		},
	)
}

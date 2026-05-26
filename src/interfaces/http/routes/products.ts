import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import {
	createProduct,
	InvalidCategoryError,
	InvalidSupplierError,
} from "../../../application/product/create-product.use-case"
import {
	createProductCategory,
	DuplicateCategoryNameError,
} from "../../../application/product/create-product-category.use-case"
import {
	ProductNotFoundError as DeactivateProductNotFoundError,
	deactivateProduct,
	ProductAlreadyInactiveError,
} from "../../../application/product/deactivate-product.use-case"
import {
	CategoryHasProductsError,
	CategoryNotFoundError as DeleteCategoryNotFoundError,
	deleteProductCategory,
} from "../../../application/product/delete-product-category.use-case"
import { getProduct, ProductNotFoundError } from "../../../application/product/get-product.use-case"
import { getProductAlerts } from "../../../application/product/get-product-alerts.use-case"
import { listProductCategories } from "../../../application/product/list-product-categories.use-case"
import { listProducts } from "../../../application/product/list-products.use-case"
import {
	InvalidCategoryError as UpdateInvalidCategoryError,
	InvalidSupplierError as UpdateInvalidSupplierError,
	ProductNotFoundError as UpdateProductNotFoundError,
	updateProduct,
} from "../../../application/product/update-product.use-case"
import {
	CategoryNotFoundError as UpdateCategoryNotFoundError,
	DuplicateCategoryNameError as UpdateDuplicateCategoryNameError,
	updateProductCategory,
} from "../../../application/product/update-product-category.use-case"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import {
	errorSchema,
	forbiddenSchema,
	notFoundSchema,
	paymentRequiredSchema,
	unauthorizedSchema,
	unprocessableSchema,
} from "../schemas/shared"

const preHandler = [authenticate, subscriptionGuard]

const unitTypeEnum = z.enum(["unit", "gram"])

const createProductBody = z.object({
	name: z.string().min(1).max(255),
	unitType: unitTypeEnum,
	costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço inválido"),
	marginPercent: z.string().regex(/^\d+(\.\d{1,2})?$/, "Margem inválida"),
	barcode: z.string().max(100).optional(),
	sku: z.string().max(100).optional(),
	brand: z.string().max(100).optional(),
	categoryId: z.string().optional(),
	supplierId: z.string().optional(),
	minQuantity: z.number().int().min(0).optional(),
	expiryDate: z.string().datetime({ local: false }).optional(),
})

const updateProductBody = z.object({
	name: z.string().min(1).max(255).optional(),
	barcode: z.string().max(100).nullable().optional(),
	sku: z.string().max(100).nullable().optional(),
	brand: z.string().max(100).nullable().optional(),
	categoryId: z.string().nullable().optional(),
	supplierId: z.string().nullable().optional(),
	unitType: unitTypeEnum.optional(),
	costPrice: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/, "Preço inválido")
		.optional(),
	marginPercent: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/, "Margem inválida")
		.optional(),
	minQuantity: z.number().int().min(0).optional(),
	expiryDate: z.string().datetime({ local: false }).nullable().optional(),
})

const listProductsQuery = z.object({
	categoryId: z.string().optional(),
	supplierId: z.string().optional(),
	lowStock: z
		.string()
		.transform((v) => v === "true")
		.optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function productsRoutes(app: FastifyInstance) {
	// ── Categories ─────────────────────────────────────────────

	app.post(
		"/products/categories",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Create product category",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: { name: { type: "string" } },
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
			if (request.ability.cannot("create", "ProductCategory")) {
				return reply.status(403).send({ error: "Sem permissão para criar categorias" })
			}

			const result = z.object({ name: z.string().min(1).max(255) }).safeParse(request.body)
			if (!result.success) {
				return reply
					.status(422)
					.send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
			}

			try {
				const category = await createProductCategory(request.tenantId, result.data.name)
				return reply.status(201).send(category)
			} catch (error) {
				if (error instanceof DuplicateCategoryNameError) {
					return reply.status(409).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.get(
		"/products/categories",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "List product categories",
				security: [{ cookieAuth: [] }],
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
				},
			},
		},
		async (request, reply) => {
			const categories = await listProductCategories(request.tenantId)
			return reply.send(categories)
		},
	)

	app.patch(
		"/products/categories/:id",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Update product category",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				body: {
					type: "object",
					properties: { name: { type: "string" } },
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					409: errorSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("update", "ProductCategory")) {
				return reply.status(403).send({ error: "Sem permissão para atualizar categorias" })
			}

			const { id } = request.params as { id: string }
			const result = z.object({ name: z.string().min(1).max(255) }).safeParse(request.body)
			if (!result.success) {
				return reply
					.status(422)
					.send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
			}

			try {
				const category = await updateProductCategory(id, request.tenantId, result.data.name)
				return reply.send(category)
			} catch (error) {
				if (error instanceof UpdateCategoryNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (error instanceof UpdateDuplicateCategoryNameError) {
					return reply.status(409).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.delete(
		"/products/categories/:id",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Delete product category",
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
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("delete", "ProductCategory")) {
				return reply.status(403).send({ error: "Sem permissão para remover categorias" })
			}

			const { id } = request.params as { id: string }
			try {
				await deleteProductCategory(id, request.tenantId)
				return reply.status(204).send()
			} catch (error) {
				if (error instanceof DeleteCategoryNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (error instanceof CategoryHasProductsError) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)

	// ── Products ───────────────────────────────────────────────

	app.post(
		"/products",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Create product",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						unitType: { type: "string", enum: ["unit", "gram"] },
						costPrice: { type: "string" },
						marginPercent: { type: "string" },
						barcode: { type: "string" },
						sku: { type: "string" },
						brand: { type: "string" },
						categoryId: { type: "string" },
						supplierId: { type: "string" },
						minQuantity: { type: "integer", minimum: 0 },
						expiryDate: { type: "string" },
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
			if (request.ability.cannot("create", "Product")) {
				return reply.status(403).send({ error: "Sem permissão para criar produtos" })
			}

			const result = createProductBody.safeParse(request.body)
			if (!result.success) {
				return reply
					.status(422)
					.send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
			}

			const { expiryDate, ...rest } = result.data

			try {
				const product = await createProduct({
					tenantId: request.tenantId,
					...rest,
					expiryDate: expiryDate ? new Date(expiryDate) : undefined,
				})
				return reply.status(201).send(product)
			} catch (error) {
				if (error instanceof InvalidCategoryError || error instanceof InvalidSupplierError) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.get(
		"/products/alerts",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Get product alerts (low stock and near expiry)",
				security: [{ cookieAuth: [] }],
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					402: paymentRequiredSchema,
				},
			},
		},
		async (request, reply) => {
			const alerts = await getProductAlerts(request.tenantId)
			return reply.send(alerts)
		},
	)

	app.get(
		"/products",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "List products",
				security: [{ cookieAuth: [] }],
				querystring: {
					type: "object",
					properties: {
						categoryId: { type: "string" },
						supplierId: { type: "string" },
						lowStock: { type: "string" },
						page: { type: "integer", minimum: 1 },
						limit: { type: "integer", minimum: 1, maximum: 100 },
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
			const result = listProductsQuery.safeParse(request.query)
			if (!result.success) {
				return reply
					.status(422)
					.send({ error: "Parâmetros inválidos", details: z.treeifyError(result.error) })
			}

			const productsList = await listProducts({ tenantId: request.tenantId, ...result.data })
			return reply.send(productsList)
		},
	)

	app.get(
		"/products/:id",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Get product",
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
				const product = await getProduct(id, request.tenantId)
				return reply.send(product)
			} catch (error) {
				if (error instanceof ProductNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.patch(
		"/products/:id",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Update product",
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
						barcode: { type: ["string", "null"] },
						sku: { type: ["string", "null"] },
						brand: { type: ["string", "null"] },
						categoryId: { type: ["string", "null"] },
						supplierId: { type: ["string", "null"] },
						unitType: { type: "string" },
						costPrice: { type: "string" },
						marginPercent: { type: "string" },
						minQuantity: { type: "integer" },
						expiryDate: { type: ["string", "null"] },
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
			if (request.ability.cannot("update", "Product")) {
				return reply.status(403).send({ error: "Sem permissão para atualizar produtos" })
			}

			const { id } = request.params as { id: string }
			const result = updateProductBody.safeParse(request.body)
			if (!result.success) {
				return reply
					.status(422)
					.send({ error: "Dados inválidos", details: z.treeifyError(result.error) })
			}

			const { expiryDate, ...rest } = result.data

			try {
				const product = await updateProduct({
					id,
					tenantId: request.tenantId,
					...rest,
					expiryDate:
						expiryDate === undefined ? undefined : expiryDate ? new Date(expiryDate) : null,
				})
				return reply.send(product)
			} catch (error) {
				if (error instanceof UpdateProductNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (
					error instanceof UpdateInvalidCategoryError ||
					error instanceof UpdateInvalidSupplierError
				) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.delete(
		"/products/:id",
		{
			preHandler,
			schema: {
				tags: ["Products"],
				summary: "Deactivate product",
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
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			if (request.ability.cannot("delete", "Product")) {
				return reply.status(403).send({ error: "Sem permissão para inativar produtos" })
			}

			const { id } = request.params as { id: string }
			try {
				await deactivateProduct(id, request.tenantId)
				return reply.status(204).send()
			} catch (error) {
				if (error instanceof DeactivateProductNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (error instanceof ProductAlreadyInactiveError) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)
}

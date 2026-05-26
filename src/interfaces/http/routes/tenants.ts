import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { getTenant, TenantNotFoundError } from "../../../application/tenant/get-tenant.use-case"
import {
	registerTenant,
	TenantAlreadyExistsError,
} from "../../../application/tenant/register-tenant.use-case"
import { updateTenant } from "../../../application/tenant/update-tenant.use-case"
import {
	InvalidLogoError,
	uploadTenantLogo,
} from "../../../application/tenant/upload-tenant-logo.use-case"
import { validateDocument } from "../../../domain/shared/document.validator"
import { authenticate } from "../middlewares/authenticate"
import {
	errorSchema,
	forbiddenSchema,
	notFoundSchema,
	unauthorizedSchema,
	unprocessableSchema,
} from "../schemas/shared"

const registerTenantBodySchema = z
	.object({
		tenantName: z.string().min(2).max(255),
		document: z.string().min(11).max(18),
		documentType: z.enum(["cpf", "cnpj"]),
		userName: z.string().min(2).max(255),
		email: z.email(),
		password: z.string().min(8),
	})
	.refine((data) => validateDocument(data.document.replace(/\D/g, ""), data.documentType), {
		message: "Documento inválido",
		path: ["document"],
	})

const updateTenantBody = z.object({
	name: z.string().min(2).max(255).optional(),
	pixKey: z.string().max(255).nullable().optional(),
	pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]).nullable().optional(),
})

export async function tenantsRoutes(app: FastifyInstance) {
	// POST /tenants is public — no authenticate middleware
	app.post(
		"/tenants",
		{
			schema: {
				tags: ["Tenants"],
				summary: "Register tenant",
				body: {
					type: "object",
					properties: {
						tenantName: { type: "string" },
						document: { type: "string" },
						documentType: { type: "string", enum: ["cpf", "cnpj"] },
						userName: { type: "string" },
						email: { type: "string" },
						password: { type: "string" },
					},
				},
				response: {
					201: { type: "object", additionalProperties: true },
					409: errorSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const result = registerTenantBodySchema.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const output = await registerTenant(result.data)
				return reply.status(201).send(output)
			} catch (error) {
				if (error instanceof TenantAlreadyExistsError) {
					return reply.status(409).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.get(
		"/tenants/:id",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Tenants"],
				summary: "Get tenant",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string }

			if (request.tenantId !== id) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			try {
				const tenant = await getTenant(id)
				return reply.send(tenant)
			} catch (error) {
				if (error instanceof TenantNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.patch(
		"/tenants/:id",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Tenants"],
				summary: "Update tenant",
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
						pixKey: { type: ["string", "null"] },
						pixKeyType: { type: ["string", "null"] },
					},
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string }

			if (request.tenantId !== id) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			if (request.ability.cannot("update", "Tenant")) {
				return reply
					.status(403)
					.send({ error: "Apenas o proprietário pode atualizar os dados da empresa" })
			}

			const result = updateTenantBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const tenant = await updateTenant({ id, ...result.data })
				return reply.send(tenant)
			} catch (error) {
				if (error instanceof TenantNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	// per-route file size limit: 5 MB — overrides any global multipart config
	const LOGO_MAX_FILE_SIZE = 5 * 1024 * 1024

	app.post(
		"/tenants/:id/logo",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Tenants"],
				summary: "Upload tenant logo",
				description: "Accepts multipart/form-data with image file (JPEG, PNG, WebP — max 5 MB)",
				security: [{ cookieAuth: [] }],
				consumes: ["multipart/form-data"],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					403: forbiddenSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string }

			if (request.tenantId !== id) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			if (request.ability.cannot("update", "Tenant")) {
				return reply
					.status(403)
					.send({ error: "Apenas o proprietário pode atualizar o logo da empresa" })
			}

			const data = await request.file({ limits: { fileSize: LOGO_MAX_FILE_SIZE } })

			if (!data) {
				return reply.status(422).send({ error: "Arquivo não enviado" })
			}

			try {
				const chunks: Buffer[] = []
				let totalSize = 0

				for await (const chunk of data.file) {
					chunks.push(chunk as Buffer)
					totalSize += chunk.length
				}

				// busboy sets `truncated` when limits.fileSize is exceeded
				if ((data.file as unknown as { truncated?: boolean }).truncated) {
					return reply
						.status(422)
						.send({ error: "Arquivo muito grande. O tamanho máximo permitido é 5 MB" })
				}

				const { Readable } = await import("node:stream")
				const stream = Readable.from(Buffer.concat(chunks))

				const result = await uploadTenantLogo({
					tenantId: id,
					stream,
					mimetype: data.mimetype,
					fileSize: totalSize,
				})

				return reply.send(result)
			} catch (error) {
				if (error instanceof InvalidLogoError) {
					return reply.status(422).send({ error: error.message })
				}
				throw error
			}
		},
	)
}

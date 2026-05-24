import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { validateDocument } from "../../../domain/shared/document.validator"
import {
	TenantAlreadyExistsError,
	registerTenant,
} from "../../../application/tenant/register-tenant.use-case"

const registerTenantBodySchema = z
	.object({
		tenantName: z.string().min(2).max(255),
		document: z.string().min(11).max(18),
		documentType: z.enum(["cpf", "cnpj"]),
		userName: z.string().min(2).max(255),
		email: z.email(),
		password: z.string().min(8),
	})
	.refine(
		(data) => validateDocument(data.document.replace(/\D/g, ""), data.documentType),
		{ message: "Documento inválido", path: ["document"] },
	)

export async function tenantsRoutes(app: FastifyInstance) {
	// POST /tenants is public — no authenticate middleware
	app.post("/tenants", async (request, reply) => {
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
	})
}

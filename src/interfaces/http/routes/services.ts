import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import { createService } from "../../../application/service/create-service.use-case"
import { listServices } from "../../../application/service/list-services.use-case"
import { getService, ServiceNotFoundError } from "../../../application/service/get-service.use-case"
import { updateService } from "../../../application/service/update-service.use-case"
import { deleteService } from "../../../application/service/delete-service.use-case"
import { getServicePricing } from "../../../application/service/get-service-pricing.use-case"
import {
	updateServicePricing,
	DuplicatePetSizeError,
} from "../../../application/service/update-service-pricing.use-case"

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
	app.post("/services", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
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
	})

	app.get("/services", { preHandler }, async (request, reply) => {
		const servicesList = await listServices(request.tenantId)
		return reply.send(servicesList)
	})

	app.get("/services/:id", { preHandler }, async (request, reply) => {
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
	})

	app.patch("/services/:id", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
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
	})

	app.delete("/services/:id", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
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
	})

	app.get("/services/:id/pricing", { preHandler }, async (request, reply) => {
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
	})

	app.put("/services/:id/pricing", { preHandler }, async (request, reply) => {
		if (request.role === "collaborator") {
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
	})
}

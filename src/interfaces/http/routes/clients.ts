import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import { createClient, InvalidDocumentError } from "../../../application/client/create-client.use-case"
import { listClients } from "../../../application/client/list-clients.use-case"
import { getClient, ClientNotFoundError } from "../../../application/client/get-client.use-case"
import { updateClient } from "../../../application/client/update-client.use-case"
import { deleteClient } from "../../../application/client/delete-client.use-case"
import { searchAddress } from "../../../infra/maps/google-maps"
import { env } from "../../../main/config/env"

const preHandler = [authenticate, subscriptionGuard]

const createClientBody = z.object({
	name: z.string().min(2).max(255),
	email: z.email().optional(),
	phone: z.string().min(8).max(30),
	document: z.string().optional(),
	addressZip: z.string().min(8).max(10),
	addressStreet: z.string().min(1).max(255),
	addressNumber: z.string().min(1).max(20),
	addressComplement: z.string().max(100).optional(),
	addressNeighborhood: z.string().min(1).max(100),
	addressCity: z.string().min(1).max(100),
	addressState: z.string().length(2),
})

const updateClientBody = createClientBody.partial()

const listClientsQuery = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	name: z.string().optional(),
	document: z.string().optional(),
})

export async function clientsRoutes(app: FastifyInstance) {
	app.get("/clients/address/autocomplete", { preHandler }, async (request, reply) => {
		const result = z.object({ q: z.string().min(3) }).safeParse(request.query)
		if (!result.success) {
			return reply.status(422).send({
				error: "Parâmetro inválido",
				details: z.treeifyError(result.error),
			})
		}

		if (!env.GOOGLE_MAPS_API_KEY) {
			return reply.status(503).send({ error: "Serviço de autocomplete indisponível" })
		}

		try {
			const suggestions = await searchAddress(result.data.q)
			return reply.send({ suggestions })
		} catch {
			return reply.status(503).send({ error: "Serviço de autocomplete indisponível" })
		}
	})

	app.get("/clients", { preHandler }, async (request, reply) => {
		const result = listClientsQuery.safeParse(request.query)
		if (!result.success) {
			return reply.status(422).send({
				error: "Parâmetros inválidos",
				details: z.treeifyError(result.error),
			})
		}

		const output = await listClients({ tenantId: request.tenantId, ...result.data })
		return reply.send(output)
	})

	app.post("/clients", { preHandler }, async (request, reply) => {
		const result = createClientBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({
				error: "Dados inválidos",
				details: z.treeifyError(result.error),
			})
		}

		try {
			const client = await createClient({ tenantId: request.tenantId, ...result.data })
			return reply.status(201).send(client)
		} catch (error) {
			if (error instanceof InvalidDocumentError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.get("/clients/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			const client = await getClient(id, request.tenantId)
			return reply.send(client)
		} catch (error) {
			if (error instanceof ClientNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.patch("/clients/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		const result = updateClientBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({
				error: "Dados inválidos",
				details: z.treeifyError(result.error),
			})
		}

		try {
			const client = await updateClient({ id, tenantId: request.tenantId, ...result.data })
			return reply.send(client)
		} catch (error) {
			if (error instanceof ClientNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			if (error instanceof InvalidDocumentError) {
				return reply.status(422).send({ error: error.message })
			}
			throw error
		}
	})

	app.delete("/clients/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			await deleteClient(id, request.tenantId)
			return reply.status(204).send()
		} catch (error) {
			if (error instanceof ClientNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})
}

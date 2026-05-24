import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { subscriptionGuard } from "../middlewares/subscription-guard"
import { createPet, ClientNotFoundError } from "../../../application/pet/create-pet.use-case"
import { listPets } from "../../../application/pet/list-pets.use-case"
import { getPet, PetNotFoundError } from "../../../application/pet/get-pet.use-case"
import { updatePet } from "../../../application/pet/update-pet.use-case"
import { deletePet } from "../../../application/pet/delete-pet.use-case"
import { uploadPetPhoto, InvalidPhotoError } from "../../../application/pet/upload-pet-photo.use-case"

const preHandler = [authenticate, subscriptionGuard]

const petSizeEnum = z.enum(["small", "medium", "large", "extra_large"])

const createPetBody = z.object({
	name: z.string().min(1).max(255),
	species: z.string().min(1).max(100),
	breed: z.string().max(100).optional(),
	birthDate: z.iso.date().optional(),
	weight: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
	size: petSizeEnum.optional(),
	notes: z.string().optional(),
})

const updatePetBody = createPetBody.partial()

export async function petsRoutes(app: FastifyInstance) {
	app.post("/clients/:clientId/pets", { preHandler }, async (request, reply) => {
		const { clientId } = request.params as { clientId: string }
		const result = createPetBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({
				error: "Dados inválidos",
				details: z.treeifyError(result.error),
			})
		}

		const { birthDate, ...rest } = result.data
		try {
			const pet = await createPet({
				tenantId: request.tenantId,
				clientId,
				...rest,
				birthDate: birthDate ? new Date(birthDate) : undefined,
			})
			return reply.status(201).send(pet)
		} catch (error) {
			if (error instanceof ClientNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.get("/clients/:clientId/pets", { preHandler }, async (request, reply) => {
		const { clientId } = request.params as { clientId: string }
		try {
			const pets = await listPets(clientId, request.tenantId)
			return reply.send(pets)
		} catch (error) {
			if (error instanceof ClientNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.get("/pets/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			const pet = await getPet(id, request.tenantId)
			return reply.send(pet)
		} catch (error) {
			if (error instanceof PetNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.patch("/pets/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		const result = updatePetBody.safeParse(request.body)
		if (!result.success) {
			return reply.status(422).send({
				error: "Dados inválidos",
				details: z.treeifyError(result.error),
			})
		}

		const { birthDate, ...rest } = result.data
		try {
			const pet = await updatePet({
				id,
				tenantId: request.tenantId,
				...rest,
				...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
			})
			return reply.send(pet)
		} catch (error) {
			if (error instanceof PetNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.delete("/pets/:id", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			await deletePet(id, request.tenantId)
			return reply.status(204).send()
		} catch (error) {
			if (error instanceof PetNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})

	app.post("/pets/:id/photo", { preHandler }, async (request, reply) => {
		const { id } = request.params as { id: string }

		const data = await request.file()
		if (!data) {
			return reply.status(422).send({ error: "Nenhum arquivo enviado" })
		}

		const chunks: Buffer[] = []
		for await (const chunk of data.file) {
			chunks.push(chunk)
		}
		const fileBuffer = Buffer.concat(chunks)
		const fileSize = fileBuffer.length

		const { Readable } = await import("node:stream")
		const stream = Readable.from(fileBuffer)

		try {
			const result = await uploadPetPhoto({
				petId: id,
				tenantId: request.tenantId,
				stream,
				mimetype: data.mimetype,
				fileSize,
			})
			return reply.send(result)
		} catch (error) {
			if (error instanceof InvalidPhotoError) {
				return reply.status(422).send({ error: error.message })
			}
			if (error instanceof PetNotFoundError) {
				return reply.status(404).send({ error: error.message })
			}
			throw error
		}
	})
}

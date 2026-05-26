import { and, eq } from "drizzle-orm"
import type { PetProps, PetSize } from "../../domain/pet/pet.entity"
import { db } from "../../infra/database/drizzle/client"
import { clients, pets } from "../../infra/database/drizzle/schema"

export class ClientNotFoundError extends Error {
	constructor() {
		super("Cliente não encontrado")
		this.name = "ClientNotFoundError"
	}
}

export interface CreatePetInput {
	tenantId: string
	clientId: string
	name: string
	species: string
	breed?: string
	birthDate?: Date
	weight?: string
	size?: PetSize
	notes?: string
}

export async function createPet(input: CreatePetInput): Promise<PetProps> {
	const [client] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(
				eq(clients.id, input.clientId),
				eq(clients.tenantId, input.tenantId),
				eq(clients.active, true),
			),
		)
		.limit(1)

	if (!client) {
		throw new ClientNotFoundError()
	}

	const [pet] = await db
		.insert(pets)
		.values({
			tenantId: input.tenantId,
			clientId: input.clientId,
			name: input.name,
			species: input.species,
			breed: input.breed ?? null,
			birthDate: input.birthDate ?? null,
			weight: input.weight ?? null,
			size: input.size ?? null,
			notes: input.notes ?? null,
		})
		.returning()

	return pet as PetProps
}

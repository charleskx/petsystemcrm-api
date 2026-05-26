import { and, eq } from "drizzle-orm"
import type { PetProps } from "../../domain/pet/pet.entity"
import { db } from "../../infra/database/drizzle/client"
import { clients, pets } from "../../infra/database/drizzle/schema"
import { ClientNotFoundError } from "./create-pet.use-case"

export { ClientNotFoundError }

export async function listPets(clientId: string, tenantId: string): Promise<PetProps[]> {
	const [client] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId), eq(clients.active, true)))
		.limit(1)

	if (!client) {
		throw new ClientNotFoundError()
	}

	const rows = await db
		.select()
		.from(pets)
		.where(and(eq(pets.clientId, clientId), eq(pets.tenantId, tenantId)))
		.orderBy(pets.createdAt)

	return rows as PetProps[]
}

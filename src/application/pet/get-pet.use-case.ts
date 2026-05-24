import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { pets } from "../../infra/database/drizzle/schema"
import type { PetProps } from "../../domain/pet/pet.entity"

export class PetNotFoundError extends Error {
	constructor() {
		super("Pet não encontrado")
		this.name = "PetNotFoundError"
	}
}

export async function getPet(id: string, tenantId: string): Promise<PetProps> {
	const [pet] = await db
		.select()
		.from(pets)
		.where(and(eq(pets.id, id), eq(pets.tenantId, tenantId)))
		.limit(1)

	if (!pet) {
		throw new PetNotFoundError()
	}

	return pet as PetProps
}

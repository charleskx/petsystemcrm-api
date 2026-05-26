import { and, eq } from "drizzle-orm"
import type { PetProps, PetSize } from "../../domain/pet/pet.entity"
import { db } from "../../infra/database/drizzle/client"
import { pets } from "../../infra/database/drizzle/schema"
import { PetNotFoundError } from "./get-pet.use-case"

export { PetNotFoundError }

export interface UpdatePetInput {
	id: string
	tenantId: string
	name?: string
	species?: string
	breed?: string | null
	birthDate?: Date | null
	weight?: string | null
	size?: PetSize | null
	notes?: string | null
}

export async function updatePet(input: UpdatePetInput): Promise<PetProps> {
	const { id, tenantId, ...fields } = input

	const [existing] = await db
		.select({ id: pets.id })
		.from(pets)
		.where(and(eq(pets.id, id), eq(pets.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new PetNotFoundError()
	}

	const [updated] = await db
		.update(pets)
		.set(fields)
		.where(and(eq(pets.id, id), eq(pets.tenantId, tenantId)))
		.returning()

	return updated as PetProps
}

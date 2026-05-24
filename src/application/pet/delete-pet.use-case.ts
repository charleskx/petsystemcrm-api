import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { pets } from "../../infra/database/drizzle/schema"
import { PetNotFoundError } from "./get-pet.use-case"

export { PetNotFoundError }

export async function deletePet(id: string, tenantId: string): Promise<void> {
	const [existing] = await db
		.select({ id: pets.id })
		.from(pets)
		.where(and(eq(pets.id, id), eq(pets.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new PetNotFoundError()
	}

	await db.delete(pets).where(and(eq(pets.id, id), eq(pets.tenantId, tenantId)))
}

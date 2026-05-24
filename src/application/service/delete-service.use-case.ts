import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { services } from "../../infra/database/drizzle/schema"
import { ServiceNotFoundError } from "./get-service.use-case"

export { ServiceNotFoundError }

export async function deleteService(id: string, tenantId: string): Promise<void> {
	const [existing] = await db
		.select({ id: services.id })
		.from(services)
		.where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new ServiceNotFoundError()
	}

	await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
}

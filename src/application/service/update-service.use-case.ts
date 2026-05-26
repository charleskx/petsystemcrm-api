import { and, eq } from "drizzle-orm"
import type { ServiceProps } from "../../domain/service/service.entity"
import { db } from "../../infra/database/drizzle/client"
import { services } from "../../infra/database/drizzle/schema"
import { ServiceNotFoundError } from "./get-service.use-case"

export { ServiceNotFoundError }

export interface UpdateServiceInput {
	id: string
	tenantId: string
	name?: string
	description?: string | null
	durationMinutes?: number
	active?: boolean
}

export async function updateService(input: UpdateServiceInput): Promise<ServiceProps> {
	const { id, tenantId, ...fields } = input

	const [existing] = await db
		.select({ id: services.id })
		.from(services)
		.where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new ServiceNotFoundError()
	}

	const [updated] = await db
		.update(services)
		.set(fields)
		.where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
		.returning()

	return updated as ServiceProps
}

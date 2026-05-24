import { db } from "../../infra/database/drizzle/client"
import { services } from "../../infra/database/drizzle/schema"
import type { ServiceProps } from "../../domain/service/service.entity"

export interface CreateServiceInput {
	tenantId: string
	name: string
	description?: string
	durationMinutes: number
	active?: boolean
}

export async function createService(input: CreateServiceInput): Promise<ServiceProps> {
	const [service] = await db
		.insert(services)
		.values({
			tenantId: input.tenantId,
			name: input.name,
			description: input.description ?? null,
			durationMinutes: input.durationMinutes,
			active: input.active ?? true,
		})
		.returning()

	return service as ServiceProps
}

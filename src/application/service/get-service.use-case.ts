import { and, eq } from "drizzle-orm"
import type { ServiceProps } from "../../domain/service/service.entity"
import { db } from "../../infra/database/drizzle/client"
import { services } from "../../infra/database/drizzle/schema"

export class ServiceNotFoundError extends Error {
	constructor() {
		super("Serviço não encontrado")
		this.name = "ServiceNotFoundError"
	}
}

export async function getService(id: string, tenantId: string): Promise<ServiceProps> {
	const [service] = await db
		.select()
		.from(services)
		.where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
		.limit(1)

	if (!service) {
		throw new ServiceNotFoundError()
	}

	return service as ServiceProps
}

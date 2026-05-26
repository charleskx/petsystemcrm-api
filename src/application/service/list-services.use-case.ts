import { asc, eq } from "drizzle-orm"
import type { ServiceProps } from "../../domain/service/service.entity"
import { db } from "../../infra/database/drizzle/client"
import { services } from "../../infra/database/drizzle/schema"

export async function listServices(tenantId: string): Promise<ServiceProps[]> {
	const rows = await db
		.select()
		.from(services)
		.where(eq(services.tenantId, tenantId))
		.orderBy(asc(services.name))

	return rows as ServiceProps[]
}

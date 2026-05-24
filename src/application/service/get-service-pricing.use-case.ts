import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { services, servicePricing } from "../../infra/database/drizzle/schema"
import type { ServicePricingProps } from "../../domain/service/service-pricing.entity"
import { ServiceNotFoundError } from "./get-service.use-case"

export { ServiceNotFoundError }

export async function getServicePricing(serviceId: string, tenantId: string): Promise<ServicePricingProps[]> {
	const [service] = await db
		.select({ id: services.id })
		.from(services)
		.where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
		.limit(1)

	if (!service) {
		throw new ServiceNotFoundError()
	}

	const rows = await db
		.select()
		.from(servicePricing)
		.where(eq(servicePricing.serviceId, serviceId))

	return rows as ServicePricingProps[]
}

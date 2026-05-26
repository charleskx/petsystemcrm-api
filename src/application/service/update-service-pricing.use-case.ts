import { and, eq } from "drizzle-orm"
import type { PetSize } from "../../domain/pet/pet.entity"
import type { ServicePricingProps } from "../../domain/service/service-pricing.entity"
import { db } from "../../infra/database/drizzle/client"
import { servicePricing, services } from "../../infra/database/drizzle/schema"
import { ServiceNotFoundError } from "./get-service.use-case"

export { ServiceNotFoundError }

export class DuplicatePetSizeError extends Error {
	constructor() {
		super("Tamanhos de pet duplicados nas faixas de preço")
		this.name = "DuplicatePetSizeError"
	}
}

export interface PricingTierInput {
	petSize: PetSize
	price: string
}

export async function updateServicePricing(
	serviceId: string,
	tenantId: string,
	tiers: PricingTierInput[],
): Promise<ServicePricingProps[]> {
	const [service] = await db
		.select({ id: services.id })
		.from(services)
		.where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
		.limit(1)

	if (!service) {
		throw new ServiceNotFoundError()
	}

	const sizes = tiers.map((t) => t.petSize)
	if (new Set(sizes).size !== sizes.length) {
		throw new DuplicatePetSizeError()
	}

	const rows = await db.transaction(async (tx) => {
		await tx.delete(servicePricing).where(eq(servicePricing.serviceId, serviceId))

		if (tiers.length === 0) return []

		return tx
			.insert(servicePricing)
			.values(tiers.map((t) => ({ serviceId, petSize: t.petSize, price: t.price })))
			.returning()
	})

	return rows as ServicePricingProps[]
}

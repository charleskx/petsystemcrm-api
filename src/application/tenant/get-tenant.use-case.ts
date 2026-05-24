import { eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { tenants } from "../../infra/database/drizzle/schema"
import type { TenantProps } from "../../domain/tenant/tenant.entity"

export class TenantNotFoundError extends Error {
	constructor() {
		super("Empresa não encontrada")
		this.name = "TenantNotFoundError"
	}
}

export async function getTenant(id: string): Promise<TenantProps> {
	const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)

	if (!tenant) {
		throw new TenantNotFoundError()
	}

	return tenant as TenantProps
}

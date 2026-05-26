import { eq } from "drizzle-orm"
import type { TenantProps } from "../../domain/tenant/tenant.entity"
import { db } from "../../infra/database/drizzle/client"
import { tenants } from "../../infra/database/drizzle/schema"
import { getTenant, TenantNotFoundError } from "./get-tenant.use-case"

export { TenantNotFoundError }

export interface UpdateTenantInput {
	id: string
	name?: string
	pixKey?: string | null
	pixKeyType?: "cpf" | "cnpj" | "email" | "phone" | "random" | null
}

export async function updateTenant(input: UpdateTenantInput): Promise<TenantProps> {
	const { id, ...fields } = input

	const hasUpdates = Object.keys(fields).length > 0

	if (hasUpdates) {
		const updates: Record<string, unknown> = {}
		if (fields.name !== undefined) updates.name = fields.name
		if ("pixKey" in fields) updates.pixKey = fields.pixKey
		if ("pixKeyType" in fields) updates.pixKeyType = fields.pixKeyType

		const result = await db
			.update(tenants)
			.set(updates)
			.where(eq(tenants.id, id))
			.returning({ id: tenants.id })

		if (result.length === 0) {
			throw new TenantNotFoundError()
		}
	}

	return getTenant(id)
}

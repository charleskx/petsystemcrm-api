import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { suppliers } from "../../infra/database/drizzle/schema"
import { SupplierNotFoundError } from "./get-supplier.use-case"

export class SupplierAlreadyInactiveError extends Error {
	constructor() {
		super("Fornecedor já está inativo")
		this.name = "SupplierAlreadyInactiveError"
	}
}

export async function deactivateSupplier(id: string, tenantId: string): Promise<void> {
	const [existing] = await db
		.select({ id: suppliers.id, active: suppliers.active })
		.from(suppliers)
		.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new SupplierNotFoundError()
	}

	if (!existing.active) {
		throw new SupplierAlreadyInactiveError()
	}

	await db
		.update(suppliers)
		.set({ active: false })
		.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
}

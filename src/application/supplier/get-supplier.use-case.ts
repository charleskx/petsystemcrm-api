import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { suppliers } from "../../infra/database/drizzle/schema"
import type { SupplierProps } from "../../domain/supplier/supplier.entity"

export class SupplierNotFoundError extends Error {
	constructor() {
		super("Fornecedor não encontrado")
		this.name = "SupplierNotFoundError"
	}
}

export async function getSupplier(id: string, tenantId: string): Promise<SupplierProps> {
	const [supplier] = await db
		.select()
		.from(suppliers)
		.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId), eq(suppliers.active, true)))
		.limit(1)

	if (!supplier) {
		throw new SupplierNotFoundError()
	}

	return supplier as SupplierProps
}

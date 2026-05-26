import { and, eq } from "drizzle-orm"
import type { SaleProps, SaleStatus } from "../../domain/sale/sale.entity"
import { db } from "../../infra/database/drizzle/client"
import { sales } from "../../infra/database/drizzle/schema"

export class SaleNotFoundError extends Error {
	constructor() {
		super("Venda não encontrada")
	}
}

export class InvalidSaleStatusTransitionError extends Error {
	constructor() {
		super("O status da venda não pode mais ser alterado")
	}
}

export async function updateSaleStatus(
	id: string,
	tenantId: string,
	status: SaleStatus,
): Promise<SaleProps> {
	const [sale] = await db
		.select()
		.from(sales)
		.where(and(eq(sales.id, id), eq(sales.tenantId, tenantId)))
		.limit(1)

	if (!sale) throw new SaleNotFoundError()
	if (sale.status !== "pending") throw new InvalidSaleStatusTransitionError()

	const [updated] = await db.update(sales).set({ status }).where(eq(sales.id, id)).returning()

	return updated as SaleProps
}

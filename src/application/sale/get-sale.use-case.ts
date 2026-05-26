import { and, eq } from "drizzle-orm"
import type { SaleProps } from "../../domain/sale/sale.entity"
import type { SaleItemProps } from "../../domain/sale/sale-item.entity"
import { db } from "../../infra/database/drizzle/client"
import { saleItems, sales } from "../../infra/database/drizzle/schema"

export class SaleNotFoundError extends Error {
	constructor() {
		super("Venda não encontrada")
	}
}

export interface GetSaleOutput {
	sale: SaleProps
	items: SaleItemProps[]
}

export async function getSale(id: string, tenantId: string): Promise<GetSaleOutput> {
	const [sale] = await db
		.select()
		.from(sales)
		.where(and(eq(sales.id, id), eq(sales.tenantId, tenantId)))
		.limit(1)

	if (!sale) throw new SaleNotFoundError()

	const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id))

	return { sale: sale as SaleProps, items: items as SaleItemProps[] }
}

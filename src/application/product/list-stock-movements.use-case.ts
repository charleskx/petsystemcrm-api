import { and, desc, eq } from "drizzle-orm"
import type {
	StockMovementProps,
	StockMovementType,
} from "../../domain/product/stock-movement.entity"
import { db } from "../../infra/database/drizzle/client"
import { stockMovements } from "../../infra/database/drizzle/schema"

export interface ListStockMovementsInput {
	tenantId: string
	productId?: string
	type?: StockMovementType
	page?: number
	limit?: number
}

export interface ListStockMovementsOutput {
	data: StockMovementProps[]
	total: number
	page: number
	limit: number
}

export async function listStockMovements(
	input: ListStockMovementsInput,
): Promise<ListStockMovementsOutput> {
	const { tenantId, productId, type } = input
	const page = input.page ?? 1
	const limit = input.limit ?? 20
	const offset = (page - 1) * limit

	const conditions = [eq(stockMovements.tenantId, tenantId)]

	if (productId) {
		conditions.push(eq(stockMovements.productId, productId))
	}

	if (type) {
		conditions.push(eq(stockMovements.type, type))
	}

	const rows = await db
		.select()
		.from(stockMovements)
		.where(and(...conditions))
		.orderBy(desc(stockMovements.createdAt))
		.limit(limit)
		.offset(offset)

	const all = await db
		.select({ id: stockMovements.id })
		.from(stockMovements)
		.where(and(...conditions))

	return {
		data: rows as StockMovementProps[],
		total: all.length,
		page,
		limit,
	}
}

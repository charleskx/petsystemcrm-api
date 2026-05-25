import { and, count, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { sales } from "../../infra/database/drizzle/schema"
import type { SaleProps, SaleStatus } from "../../domain/sale/sale.entity"

export interface ListSalesInput {
	tenantId: string
	clientId?: string
	status?: SaleStatus
	from?: Date
	to?: Date
	page?: number
	limit?: number
}

export interface ListSalesOutput {
	data: SaleProps[]
	total: number
	page: number
	limit: number
}

export async function listSales(input: ListSalesInput): Promise<ListSalesOutput> {
	const page = Math.max(1, input.page ?? 1)
	const limit = Math.min(100, Math.max(1, input.limit ?? 20))
	const offset = (page - 1) * limit

	const conditions = [
		eq(sales.tenantId, input.tenantId),
		...(input.clientId ? [eq(sales.clientId, input.clientId)] : []),
		...(input.status ? [eq(sales.status, input.status)] : []),
		...(input.from ? [gte(sales.createdAt, input.from)] : []),
		...(input.to ? [lte(sales.createdAt, input.to)] : []),
	]

	const where = and(...conditions)

	const [rows, [{ value: total }]] = await Promise.all([
		db.select().from(sales).where(where).orderBy(desc(sales.createdAt)).limit(limit).offset(offset),
		db.select({ value: count() }).from(sales).where(where),
	])

	return { data: rows as SaleProps[], total: Number(total), page, limit }
}

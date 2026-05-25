import { and, asc, eq, lte, sql } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { products } from "../../infra/database/drizzle/schema"
import type { ProductProps } from "../../domain/product/product.entity"

export interface ListProductsInput {
	tenantId: string
	categoryId?: string
	supplierId?: string
	lowStock?: boolean
	page?: number
	limit?: number
}

export interface ListProductsOutput {
	data: ProductProps[]
	total: number
	page: number
	limit: number
}

export async function listProducts(input: ListProductsInput): Promise<ListProductsOutput> {
	const { tenantId, categoryId, supplierId, lowStock } = input
	const page = input.page ?? 1
	const limit = input.limit ?? 20
	const offset = (page - 1) * limit

	const conditions = [eq(products.tenantId, tenantId), eq(products.active, true)]

	if (categoryId) {
		conditions.push(eq(products.categoryId, categoryId))
	}

	if (supplierId) {
		conditions.push(eq(products.supplierId, supplierId))
	}

	if (lowStock) {
		conditions.push(lte(products.quantity, sql`${products.minQuantity}`))
	}

	const rows = await db
		.select()
		.from(products)
		.where(and(...conditions))
		.orderBy(asc(products.name))
		.limit(limit)
		.offset(offset)

	const all = await db
		.select({ id: products.id })
		.from(products)
		.where(and(...conditions))

	return {
		data: rows as ProductProps[],
		total: all.length,
		page,
		limit,
	}
}

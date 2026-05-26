import { and, count, eq, ilike } from "drizzle-orm"
import type { SupplierProps } from "../../domain/supplier/supplier.entity"
import { db } from "../../infra/database/drizzle/client"
import { suppliers } from "../../infra/database/drizzle/schema"

export interface ListSuppliersInput {
	tenantId: string
	active?: boolean
	name?: string
	page?: number
	limit?: number
}

export interface ListSuppliersOutput {
	data: SupplierProps[]
	total: number
	page: number
	limit: number
}

export async function listSuppliers(input: ListSuppliersInput): Promise<ListSuppliersOutput> {
	const page = Math.max(1, input.page ?? 1)
	const limit = Math.min(100, Math.max(1, input.limit ?? 20))
	const offset = (page - 1) * limit
	const activeFilter = input.active ?? true

	const conditions = [
		eq(suppliers.tenantId, input.tenantId),
		eq(suppliers.active, activeFilter),
		...(input.name ? [ilike(suppliers.name, `%${input.name}%`)] : []),
	]

	const where = and(...conditions)

	const [rows, [{ value: total }]] = await Promise.all([
		db.select().from(suppliers).where(where).orderBy(suppliers.name).limit(limit).offset(offset),
		db.select({ value: count() }).from(suppliers).where(where),
	])

	return { data: rows as SupplierProps[], total: Number(total), page, limit }
}

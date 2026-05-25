import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { productCategories, products, suppliers } from "../../infra/database/drizzle/schema"
import type { ProductProps } from "../../domain/product/product.entity"

export class ProductNotFoundError extends Error {
	constructor() {
		super("Produto não encontrado")
	}
}

export async function getProduct(
	id: string,
	tenantId: string,
): Promise<ProductProps & { category: { id: string; name: string } | null; supplier: { id: string; name: string } | null }> {
	const [row] = await db
		.select()
		.from(products)
		.where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
		.limit(1)

	if (!row) {
		throw new ProductNotFoundError()
	}

	let category: { id: string; name: string } | null = null
	if (row.categoryId) {
		const [cat] = await db
			.select({ id: productCategories.id, name: productCategories.name })
			.from(productCategories)
			.where(eq(productCategories.id, row.categoryId))
			.limit(1)
		category = cat ?? null
	}

	let supplier: { id: string; name: string } | null = null
	if (row.supplierId) {
		const [sup] = await db
			.select({ id: suppliers.id, name: suppliers.name })
			.from(suppliers)
			.where(eq(suppliers.id, row.supplierId))
			.limit(1)
		supplier = sup ?? null
	}

	return { ...(row as ProductProps), category, supplier }
}

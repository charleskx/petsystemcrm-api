import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { productCategories, products } from "../../infra/database/drizzle/schema"

export class CategoryNotFoundError extends Error {
	constructor() {
		super("Categoria não encontrada")
	}
}

export class CategoryHasProductsError extends Error {
	constructor() {
		super("A categoria possui produtos ativos e não pode ser removida")
	}
}

export async function deleteProductCategory(id: string, tenantId: string): Promise<void> {
	const [category] = await db
		.select({ id: productCategories.id })
		.from(productCategories)
		.where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)))
		.limit(1)

	if (!category) {
		throw new CategoryNotFoundError()
	}

	const activeProducts = await db
		.select({ id: products.id })
		.from(products)
		.where(and(eq(products.categoryId, id), eq(products.active, true)))
		.limit(1)

	if (activeProducts.length > 0) {
		throw new CategoryHasProductsError()
	}

	await db.delete(productCategories).where(eq(productCategories.id, id))
}

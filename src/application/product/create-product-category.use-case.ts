import { and, eq } from "drizzle-orm"
import type { ProductCategoryProps } from "../../domain/product/product-category.entity"
import { db } from "../../infra/database/drizzle/client"
import { productCategories } from "../../infra/database/drizzle/schema"

export class DuplicateCategoryNameError extends Error {
	constructor() {
		super("Já existe uma categoria com este nome")
	}
}

export async function createProductCategory(
	tenantId: string,
	name: string,
): Promise<ProductCategoryProps> {
	const existing = await db
		.select({ id: productCategories.id })
		.from(productCategories)
		.where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.name, name)))
		.limit(1)

	if (existing.length > 0) {
		throw new DuplicateCategoryNameError()
	}

	const [category] = await db.insert(productCategories).values({ tenantId, name }).returning()

	return category as ProductCategoryProps
}

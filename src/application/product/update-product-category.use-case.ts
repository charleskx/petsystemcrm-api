import { and, eq, ne } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { productCategories } from "../../infra/database/drizzle/schema"
import type { ProductCategoryProps } from "../../domain/product/product-category.entity"

export class CategoryNotFoundError extends Error {
	constructor() {
		super("Categoria não encontrada")
	}
}

export class DuplicateCategoryNameError extends Error {
	constructor() {
		super("Já existe uma categoria com este nome")
	}
}

export async function updateProductCategory(
	id: string,
	tenantId: string,
	name: string,
): Promise<ProductCategoryProps> {
	const [existing] = await db
		.select()
		.from(productCategories)
		.where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)))
		.limit(1)

	if (!existing) {
		throw new CategoryNotFoundError()
	}

	const duplicate = await db
		.select({ id: productCategories.id })
		.from(productCategories)
		.where(
			and(
				eq(productCategories.tenantId, tenantId),
				eq(productCategories.name, name),
				ne(productCategories.id, id),
			),
		)
		.limit(1)

	if (duplicate.length > 0) {
		throw new DuplicateCategoryNameError()
	}

	const [updated] = await db
		.update(productCategories)
		.set({ name })
		.where(eq(productCategories.id, id))
		.returning()

	return updated as ProductCategoryProps
}

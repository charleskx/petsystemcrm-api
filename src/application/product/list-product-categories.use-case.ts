import { asc, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { productCategories } from "../../infra/database/drizzle/schema"
import type { ProductCategoryProps } from "../../domain/product/product-category.entity"

export async function listProductCategories(tenantId: string): Promise<ProductCategoryProps[]> {
	const rows = await db
		.select()
		.from(productCategories)
		.where(eq(productCategories.tenantId, tenantId))
		.orderBy(asc(productCategories.name))

	return rows as ProductCategoryProps[]
}

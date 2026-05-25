import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { products } from "../../infra/database/drizzle/schema"

export class ProductNotFoundError extends Error {
	constructor() {
		super("Produto não encontrado")
	}
}

export class ProductAlreadyInactiveError extends Error {
	constructor() {
		super("O produto já está inativo")
	}
}

export async function deactivateProduct(id: string, tenantId: string): Promise<void> {
	const [product] = await db
		.select({ id: products.id, active: products.active })
		.from(products)
		.where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
		.limit(1)

	if (!product) {
		throw new ProductNotFoundError()
	}

	if (!product.active) {
		throw new ProductAlreadyInactiveError()
	}

	await db.update(products).set({ active: false }).where(eq(products.id, id))
}

import { and, eq } from "drizzle-orm"
import type { ProductProps, UnitType } from "../../domain/product/product.entity"
import { db } from "../../infra/database/drizzle/client"
import { productCategories, products, suppliers } from "../../infra/database/drizzle/schema"

export class InvalidCategoryError extends Error {
	constructor() {
		super("Categoria não encontrada")
	}
}

export class InvalidSupplierError extends Error {
	constructor() {
		super("Fornecedor não encontrado")
	}
}

export interface CreateProductInput {
	tenantId: string
	name: string
	unitType: UnitType
	costPrice: string
	marginPercent: string
	barcode?: string
	sku?: string
	brand?: string
	categoryId?: string
	supplierId?: string
	minQuantity?: number
	expiryDate?: Date
}

function computeSalePrice(costPrice: string, marginPercent: string): string {
	const cost = Number.parseFloat(costPrice)
	const margin = Number.parseFloat(marginPercent)
	return (Math.round(cost * (1 + margin / 100) * 100) / 100).toFixed(2)
}

export async function createProduct(input: CreateProductInput): Promise<ProductProps> {
	const { tenantId, categoryId, supplierId } = input

	if (categoryId) {
		const [cat] = await db
			.select({ id: productCategories.id })
			.from(productCategories)
			.where(and(eq(productCategories.id, categoryId), eq(productCategories.tenantId, tenantId)))
			.limit(1)
		if (!cat) throw new InvalidCategoryError()
	}

	if (supplierId) {
		const [sup] = await db
			.select({ id: suppliers.id })
			.from(suppliers)
			.where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
			.limit(1)
		if (!sup) throw new InvalidSupplierError()
	}

	const salePrice = computeSalePrice(input.costPrice, input.marginPercent)

	const [product] = await db
		.insert(products)
		.values({
			tenantId,
			supplierId: supplierId ?? null,
			categoryId: categoryId ?? null,
			name: input.name,
			barcode: input.barcode ?? null,
			sku: input.sku ?? null,
			brand: input.brand ?? null,
			unitType: input.unitType,
			costPrice: input.costPrice,
			marginPercent: input.marginPercent,
			salePrice,
			quantity: 0,
			minQuantity: input.minQuantity ?? 0,
			expiryDate: input.expiryDate ?? null,
			active: true,
		})
		.returning()

	return product as ProductProps
}

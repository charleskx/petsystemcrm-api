import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { productCategories, products, suppliers } from "../../infra/database/drizzle/schema"
import type { ProductProps, UnitType } from "../../domain/product/product.entity"

export class ProductNotFoundError extends Error {
	constructor() {
		super("Produto não encontrado")
	}
}

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

export interface UpdateProductInput {
	id: string
	tenantId: string
	name?: string
	barcode?: string | null
	sku?: string | null
	brand?: string | null
	categoryId?: string | null
	supplierId?: string | null
	unitType?: UnitType
	costPrice?: string
	marginPercent?: string
	minQuantity?: number
	expiryDate?: Date | null
}

function computeSalePrice(costPrice: string, marginPercent: string): string {
	const cost = Number.parseFloat(costPrice)
	const margin = Number.parseFloat(marginPercent)
	return (Math.round(cost * (1 + margin / 100) * 100) / 100).toFixed(2)
}

export async function updateProduct(input: UpdateProductInput): Promise<ProductProps> {
	const { id, tenantId, categoryId, supplierId } = input

	const [current] = await db
		.select()
		.from(products)
		.where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
		.limit(1)

	if (!current) {
		throw new ProductNotFoundError()
	}

	if (categoryId !== undefined && categoryId !== null) {
		const [cat] = await db
			.select({ id: productCategories.id })
			.from(productCategories)
			.where(and(eq(productCategories.id, categoryId), eq(productCategories.tenantId, tenantId)))
			.limit(1)
		if (!cat) throw new InvalidCategoryError()
	}

	if (supplierId !== undefined && supplierId !== null) {
		const [sup] = await db
			.select({ id: suppliers.id })
			.from(suppliers)
			.where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
			.limit(1)
		if (!sup) throw new InvalidSupplierError()
	}

	const newCostPrice = input.costPrice ?? current.costPrice
	const newMarginPercent = input.marginPercent ?? current.marginPercent

	const salePrice =
		input.costPrice !== undefined || input.marginPercent !== undefined
			? computeSalePrice(newCostPrice, newMarginPercent)
			: current.salePrice

	const updateData: Record<string, unknown> = { salePrice }

	if (input.name !== undefined) updateData.name = input.name
	if (input.barcode !== undefined) updateData.barcode = input.barcode
	if (input.sku !== undefined) updateData.sku = input.sku
	if (input.brand !== undefined) updateData.brand = input.brand
	if (categoryId !== undefined) updateData.categoryId = categoryId
	if (supplierId !== undefined) updateData.supplierId = supplierId
	if (input.unitType !== undefined) updateData.unitType = input.unitType
	if (input.costPrice !== undefined) updateData.costPrice = input.costPrice
	if (input.marginPercent !== undefined) updateData.marginPercent = input.marginPercent
	if (input.minQuantity !== undefined) updateData.minQuantity = input.minQuantity
	if (input.expiryDate !== undefined) updateData.expiryDate = input.expiryDate

	const [updated] = await db
		.update(products)
		.set(updateData)
		.where(eq(products.id, id))
		.returning()

	return updated as ProductProps
}

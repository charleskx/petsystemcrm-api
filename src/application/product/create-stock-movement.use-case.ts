import { and, eq, sql } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { products, stockMovements } from "../../infra/database/drizzle/schema"
import type { StockMovementProps, StockMovementType } from "../../domain/product/stock-movement.entity"

export class ProductNotFoundError extends Error {
	constructor() {
		super("Produto não encontrado")
	}
}

export class ProductInactiveError extends Error {
	constructor() {
		super("O produto está inativo")
	}
}

export class InsufficientStockError extends Error {
	constructor() {
		super("Estoque insuficiente para esta operação")
	}
}

export interface CreateStockMovementInput {
	tenantId: string
	productId: string
	type: StockMovementType
	quantity: number
	reason: string
	referenceId?: string
}

export interface CreateStockMovementOutput {
	movement: StockMovementProps
	newQuantity: number
}

export async function createStockMovement(input: CreateStockMovementInput): Promise<CreateStockMovementOutput> {
	const { tenantId, productId, type, quantity, reason, referenceId } = input

	return await db.transaction(async (tx) => {
		const [product] = await tx
			.select({ id: products.id, active: products.active, quantity: products.quantity })
			.from(products)
			.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
			.limit(1)

		if (!product) throw new ProductNotFoundError()
		if (!product.active) throw new ProductInactiveError()

		if (type === "out" && quantity > product.quantity) {
			throw new InsufficientStockError()
		}

		const delta = type === "in" ? quantity : -quantity

		await tx
			.update(products)
			.set({ quantity: sql`${products.quantity} + ${delta}` })
			.where(eq(products.id, productId))

		const [movement] = await tx
			.insert(stockMovements)
			.values({
				tenantId,
				productId,
				type,
				quantity,
				reason,
				referenceId: referenceId ?? null,
			})
			.returning()

		const newQuantity = product.quantity + delta

		return { movement: movement as StockMovementProps, newQuantity }
	})
}

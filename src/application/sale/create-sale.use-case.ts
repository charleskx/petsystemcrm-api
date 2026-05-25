import { and, eq, sql } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { products, sales, saleItems, stockMovements } from "../../infra/database/drizzle/schema"
import type { SaleChannel, SalePaymentMethod, SaleProps } from "../../domain/sale/sale.entity"
import type { SaleItemProps } from "../../domain/sale/sale-item.entity"

export class ProductNotFoundError extends Error {
	constructor(public readonly productId: string) {
		super(`Produto não encontrado: ${productId}`)
	}
}

export class ProductInactiveError extends Error {
	constructor(public readonly productId: string) {
		super(`Produto inativo: ${productId}`)
	}
}

export class InsufficientStockError extends Error {
	constructor(public readonly productId: string) {
		super(`Estoque insuficiente para o produto: ${productId}`)
	}
}

export interface CreateSaleInput {
	tenantId: string
	clientId?: string
	channel?: SaleChannel
	paymentMethod: SalePaymentMethod
	items: Array<{ productId: string; quantity: number }>
}

export interface CreateSaleOutput {
	sale: SaleProps
	items: SaleItemProps[]
}

export async function createSale(input: CreateSaleInput): Promise<CreateSaleOutput> {
	const { tenantId, clientId, paymentMethod, items } = input
	const channel = input.channel ?? "in_store"

	return await db.transaction(async (tx) => {
		let totalAmount = 0
		const resolvedItems: Array<{ productId: string; quantity: number; unitPrice: string }> = []

		for (const item of items) {
			const [product] = await tx
				.select({
					id: products.id,
					active: products.active,
					quantity: products.quantity,
					salePrice: products.salePrice,
				})
				.from(products)
				.where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)))
				.limit(1)

			if (!product) throw new ProductNotFoundError(item.productId)
			if (!product.active) throw new ProductInactiveError(item.productId)
			if (item.quantity > product.quantity) throw new InsufficientStockError(item.productId)

			const unitPrice = Number(product.salePrice)
			totalAmount += unitPrice * item.quantity
			resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.salePrice })
		}

		const [sale] = await tx
			.insert(sales)
			.values({
				tenantId,
				clientId: clientId ?? null,
				channel,
				paymentMethod,
				totalAmount: totalAmount.toFixed(2),
				status: "pending",
			})
			.returning()

		const insertedItems: SaleItemProps[] = []

		for (const item of resolvedItems) {
			const [saleItem] = await tx
				.insert(saleItems)
				.values({
					saleId: sale.id,
					productId: item.productId,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
				})
				.returning()

			insertedItems.push(saleItem as SaleItemProps)

			const delta = -item.quantity
			await tx
				.update(products)
				.set({ quantity: sql`${products.quantity} + ${delta}` })
				.where(eq(products.id, item.productId))

			await tx.insert(stockMovements).values({
				tenantId,
				productId: item.productId,
				type: "out",
				quantity: item.quantity,
				reason: "Venda",
				referenceId: sale.id,
			})
		}

		return { sale: sale as SaleProps, items: insertedItems }
	})
}

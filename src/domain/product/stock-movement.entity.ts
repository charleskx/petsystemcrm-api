export type StockMovementType = "in" | "out"

export interface StockMovementProps {
	id: string
	tenantId: string
	productId: string
	type: StockMovementType
	quantity: number
	reason: string
	referenceId: string | null
	createdAt: Date
}

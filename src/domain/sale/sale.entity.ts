export type SaleStatus = "pending" | "paid" | "cancelled"
export type SaleChannel = "in_store" | "online"
export type SalePaymentMethod = "pix" | "credit_card" | "debit_card" | "cash" | "other"

export interface SaleProps {
	id: string
	tenantId: string
	clientId: string | null
	channel: SaleChannel
	totalAmount: string
	paymentMethod: SalePaymentMethod
	status: SaleStatus
	createdAt: Date
}

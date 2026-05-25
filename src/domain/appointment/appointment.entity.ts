export type AppointmentStatus = "scheduled" | "in_progress" | "completed" | "cancelled"
export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "cash" | "other"

export interface AppointmentProps {
	id: string
	tenantId: string
	clientId: string
	petId: string
	status: AppointmentStatus
	paymentMethod: PaymentMethod
	totalAmount: string
	notes: string | null
	scheduledAt: Date
	createdAt: Date
}

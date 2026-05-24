export type DocumentType = "cpf" | "cnpj"
export type Plan = "essential" | "premium"
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled" | "past_due"
export type MemberRole = "owner" | "financial" | "collaborator"

export interface TenantProps {
	id: string
	name: string
	document: string
	documentType: DocumentType
	logoUrl?: string | null
	pixKey?: string | null
	pixKeyType?: string | null
	plan: Plan
	subscriptionStatus: SubscriptionStatus
	trialEndsAt: Date
	stripeCustomerId?: string | null
	stripeSubscriptionId?: string | null
	active: boolean
	createdAt: Date
}

export const TRIAL_DURATION_DAYS = 14

export function createTrialEndsAt(from: Date = new Date()): Date {
	const trialEndsAt = new Date(from)
	trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS)
	return trialEndsAt
}

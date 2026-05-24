export type PetSize = "small" | "medium" | "large" | "extra_large"

export interface PetProps {
	id: string
	tenantId: string
	clientId: string
	name: string
	species: string
	breed?: string | null
	birthDate?: Date | null
	weight?: string | null
	size?: PetSize | null
	notes?: string | null
	photoUrl?: string | null
	createdAt: Date
}

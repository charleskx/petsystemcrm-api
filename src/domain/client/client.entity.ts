export interface ClientProps {
	id: string
	tenantId: string
	name: string
	email?: string | null
	phone: string
	document?: string | null
	addressZip: string
	addressStreet: string
	addressNumber: string
	addressComplement?: string | null
	addressNeighborhood: string
	addressCity: string
	addressState: string
	active: boolean
	createdAt: Date
}

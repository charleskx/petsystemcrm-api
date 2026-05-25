export interface SupplierProps {
	id: string
	tenantId: string
	name: string
	document?: string | null
	email?: string | null
	phone?: string | null
	addressZip?: string | null
	addressStreet?: string | null
	addressCity?: string | null
	addressState?: string | null
	contactName?: string | null
	active: boolean
}

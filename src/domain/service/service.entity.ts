export interface ServiceProps {
	id: string
	tenantId: string
	name: string
	description?: string | null
	durationMinutes: number
	active: boolean
	createdAt: Date
}

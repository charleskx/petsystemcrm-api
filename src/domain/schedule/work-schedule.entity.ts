export type DayOfWeek = "0" | "1" | "2" | "3" | "4" | "5" | "6"

export interface WorkScheduleProps {
	id: string
	tenantId: string
	dayOfWeek: DayOfWeek
	openTime: string | null
	closeTime: string | null
	isClosed: boolean
}

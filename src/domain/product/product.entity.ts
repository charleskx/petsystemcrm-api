export type UnitType = "unit" | "gram"

export interface ProductProps {
	id: string
	tenantId: string
	supplierId: string | null
	categoryId: string | null
	name: string
	barcode: string | null
	sku: string | null
	brand: string | null
	unitType: UnitType
	costPrice: string
	marginPercent: string
	salePrice: string
	quantity: number
	minQuantity: number
	expiryDate: Date | null
	active: boolean
	createdAt: Date
}

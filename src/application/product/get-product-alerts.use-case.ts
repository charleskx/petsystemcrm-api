import { and, eq, lte, or, sql } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { products } from "../../infra/database/drizzle/schema"
import type { ProductProps } from "../../domain/product/product.entity"

export type AlertType = "low_stock" | "near_expiry"

export interface ProductAlert extends ProductProps {
	alertTypes: AlertType[]
}

export async function getProductAlerts(tenantId: string): Promise<ProductAlert[]> {
	const thirtyDaysFromNow = new Date()
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

	const rows = await db
		.select()
		.from(products)
		.where(
			and(
				eq(products.tenantId, tenantId),
				eq(products.active, true),
				or(
					lte(products.quantity, sql`${products.minQuantity}`),
					and(
						sql`${products.expiryDate} IS NOT NULL`,
						lte(products.expiryDate, thirtyDaysFromNow),
					),
				),
			),
		)

	return rows.map((row) => {
		const alertTypes: AlertType[] = []
		if (row.quantity <= row.minQuantity) alertTypes.push("low_stock")
		if (row.expiryDate && row.expiryDate <= thirtyDaysFromNow) alertTypes.push("near_expiry")
		return { ...(row as ProductProps), alertTypes }
	})
}

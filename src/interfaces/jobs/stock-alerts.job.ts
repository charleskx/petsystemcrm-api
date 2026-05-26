import { and, eq, inArray } from "drizzle-orm"
import { getProductAlerts } from "../../application/product/get-product-alerts.use-case"
import { db } from "../../infra/database/drizzle/client"
import { user } from "../../infra/database/drizzle/schema/auth"
import { tenantMembers, tenants } from "../../infra/database/drizzle/schema/tenants"
import { getResend } from "../../infra/email/resend"
import { renderStockAlertEmail } from "../../infra/email/templates/stock-alert"

async function processOneTenant(tenantId: string, tenantName: string): Promise<void> {
	const alerts = await getProductAlerts(tenantId)
	if (alerts.length === 0) return

	const ownerRows = await db
		.select({ email: user.email, name: user.name })
		.from(tenantMembers)
		.innerJoin(user, eq(user.id, tenantMembers.userId))
		.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "owner")))
		.limit(1)

	if (ownerRows.length === 0) return

	const lowStockProducts = alerts
		.filter((a) => a.alertTypes.includes("low_stock"))
		.map((a) => ({
			name: a.name,
			quantity: a.quantity,
			minQuantity: a.minQuantity,
			expiryDate: a.expiryDate ?? null,
			alertTypes: a.alertTypes,
		}))

	const nearExpiryProducts = alerts
		.filter((a) => a.alertTypes.includes("near_expiry"))
		.map((a) => ({
			name: a.name,
			quantity: a.quantity,
			minQuantity: a.minQuantity,
			expiryDate: a.expiryDate ?? null,
			alertTypes: a.alertTypes,
		}))

	const html = renderStockAlertEmail({ tenantName, lowStockProducts, nearExpiryProducts })

	await getResend().emails.send({
		from: "alertas@petsystemcrm.com.br",
		to: ownerRows[0].email,
		subject: `Alerta de estoque — ${tenantName}`,
		html,
	})
}

export async function runStockAlertsJob(): Promise<void> {
	console.log("[stock-alerts] iniciando job")

	const activeTenants = await db
		.select({ id: tenants.id, name: tenants.name })
		.from(tenants)
		.where(and(eq(tenants.active, true), inArray(tenants.subscriptionStatus, ["trial", "active"])))

	const CHUNK_SIZE = 10
	for (let i = 0; i < activeTenants.length; i += CHUNK_SIZE) {
		const chunk = activeTenants.slice(i, i + CHUNK_SIZE)
		await Promise.all(
			chunk.map(async ({ id, name }) => {
				try {
					await processOneTenant(id, name)
				} catch (err) {
					console.error(`[stock-alerts] erro ao processar tenant ${id}:`, err)
				}
			}),
		)
	}

	console.log(`[stock-alerts] concluído — ${activeTenants.length} tenant(s) processado(s)`)
}

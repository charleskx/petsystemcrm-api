import { eq } from "drizzle-orm"
import type { FastifyReply, FastifyRequest } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"

export async function subscriptionGuard(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (request.url.startsWith("/dashboard")) return

	const tenant = await db
		.select({
			subscriptionStatus: tenants.subscriptionStatus,
			trialEndsAt: tenants.trialEndsAt,
		})
		.from(tenants)
		.where(eq(tenants.id, request.tenantId))
		.limit(1)
		.then((rows) => rows[0])

	if (!tenant) {
		reply.status(402).send({ error: "Assinatura inválida" })
		return
	}

	let { subscriptionStatus } = tenant

	// Lazy trial expiry: if trial period ended, mark as expired
	if (subscriptionStatus === "trial" && tenant.trialEndsAt < new Date()) {
		await db
			.update(tenants)
			.set({ subscriptionStatus: "expired" })
			.where(eq(tenants.id, request.tenantId))
		subscriptionStatus = "expired"
	}

	if (
		subscriptionStatus === "expired" ||
		subscriptionStatus === "cancelled" ||
		subscriptionStatus === "past_due"
	) {
		reply
			.status(402)
			.send({ error: "Pagamento necessário. Acesse /billing para regularizar sua assinatura." })
	}
}

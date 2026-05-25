import { eq } from "drizzle-orm"
import type { FastifyReply, FastifyRequest } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"

export async function premiumGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const tenant = await db
		.select({ plan: tenants.plan, subscriptionStatus: tenants.subscriptionStatus })
		.from(tenants)
		.where(eq(tenants.id, request.tenantId))
		.limit(1)
		.then((rows) => rows[0])

	if (!tenant) return

	// Trial gives full premium access regardless of plan setting
	if (tenant.subscriptionStatus === "trial") return

	if (tenant.subscriptionStatus === "active" && tenant.plan === "essential") {
		reply.status(403).send({ error: "Esta funcionalidade requer o plano Premium" })
	}
}

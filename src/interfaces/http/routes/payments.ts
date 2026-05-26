import type { FastifyInstance } from "fastify"
import Stripe from "stripe"
import { eq } from "drizzle-orm"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { env } from "../../../main/config/env"
import { errorSchema } from "../schemas/shared"

function stripeStatusToLocal(status: string): "active" | "past_due" | "cancelled" | "expired" | "trial" {
	switch (status) {
		case "active":
			return "active"
		case "past_due":
			return "past_due"
		case "canceled":
		case "cancelled":
			return "cancelled"
		default:
			return "active"
	}
}

function priceIdToPlan(priceId: string | null | undefined): "essential" | "premium" {
	if (!priceId) return "essential"
	if (env.STRIPE_PRICE_PREMIUM && priceId === env.STRIPE_PRICE_PREMIUM) return "premium"
	return "essential"
}

export async function paymentsRoutes(app: FastifyInstance) {
	app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
		done(null, body)
	})

	app.post(
		"/payments/stripe/webhook",
		{
			schema: {
				tags: ["Payments"],
				summary: "Stripe webhook",
				description: "Receives Stripe events to update subscription status. No authentication required.",
				response: {
					200: { type: "object", properties: { received: { type: "boolean" } } },
					400: errorSchema,
					500: errorSchema,
				},
			},
		},
		async (request, reply) => {
			if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
				return reply.status(500).send({ error: "Stripe não configurado" })
			}

			const stripe = new Stripe(env.STRIPE_SECRET_KEY)
			const sig = request.headers["stripe-signature"] as string

			let event: ReturnType<typeof stripe.webhooks.constructEvent>
			try {
				event = stripe.webhooks.constructEvent(request.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET)
			} catch {
				return reply.status(400).send({ error: "Assinatura do webhook inválida" })
			}

			switch (event.type) {
				case "checkout.session.completed": {
					const session = event.data.object
					if (session.mode !== "subscription") break

					const tenantId = session.metadata?.tenantId
					if (!tenantId) break

					const subscriptionId = session.subscription as string
					const subscription = await stripe.subscriptions.retrieve(subscriptionId)
					const priceId = subscription.items.data[0]?.price.id
					const plan = priceIdToPlan(priceId)

					await db
						.update(tenants)
						.set({ subscriptionStatus: "active", plan, stripeSubscriptionId: subscriptionId })
						.where(eq(tenants.id, tenantId))

					break
				}

				case "customer.subscription.updated": {
					const subscription = event.data.object
					const customerId = subscription.customer as string

					const tenant = await db
						.select({ id: tenants.id })
						.from(tenants)
						.where(eq(tenants.stripeCustomerId, customerId))
						.limit(1)
						.then((rows) => rows[0])

					if (!tenant) break

					const priceId = subscription.items.data[0]?.price.id
					const plan = priceIdToPlan(priceId)
					const subscriptionStatus = stripeStatusToLocal(subscription.status)

					await db.update(tenants).set({ subscriptionStatus, plan }).where(eq(tenants.id, tenant.id))
					break
				}

				case "customer.subscription.deleted": {
					const subscription = event.data.object
					const customerId = subscription.customer as string

					const tenant = await db
						.select({ id: tenants.id })
						.from(tenants)
						.where(eq(tenants.stripeCustomerId, customerId))
						.limit(1)
						.then((rows) => rows[0])

					if (!tenant) break

					await db.update(tenants).set({ subscriptionStatus: "cancelled" }).where(eq(tenants.id, tenant.id))
					break
				}

				case "invoice.payment_failed": {
					const invoice = event.data.object
					const customerId = invoice.customer as string

					const tenant = await db
						.select({ id: tenants.id })
						.from(tenants)
						.where(eq(tenants.stripeCustomerId, customerId))
						.limit(1)
						.then((rows) => rows[0])

					if (!tenant) break

					await db.update(tenants).set({ subscriptionStatus: "past_due" }).where(eq(tenants.id, tenant.id))
					break
				}
			}

			return reply.send({ received: true })
		},
	)
}

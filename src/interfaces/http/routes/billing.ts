import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import Stripe from "stripe"
import { z } from "zod/v4"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { env } from "../../../main/config/env"
import { authenticate } from "../middlewares/authenticate"
import {
	errorSchema,
	notFoundSchema,
	unauthorizedSchema,
	unprocessableSchema,
} from "../schemas/shared"

function getStripe() {
	if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não configurado")
	return new Stripe(env.STRIPE_SECRET_KEY)
}

const planSchema = z.enum(["essential", "premium"])

export async function billingRoutes(app: FastifyInstance) {
	app.get(
		"/billing/subscription",
		{
			preHandler: [authenticate],
			schema: {
				tags: ["Billing"],
				summary: "Get subscription status",
				security: [{ cookieAuth: [] }],
				response: {
					200: {
						type: "object",
						properties: {
							status: {
								type: "string",
								enum: ["trial", "active", "expired", "cancelled", "past_due"],
							},
							plan: { type: "string", enum: ["essential", "premium"] },
							trialEndsAt: { type: "string", format: "date-time", nullable: true },
							stripeSubscriptionId: { type: "string", nullable: true },
						},
					},
					401: unauthorizedSchema,
					404: notFoundSchema,
				},
			},
		},
		async (request, reply) => {
			const tenant = await db
				.select({
					subscriptionStatus: tenants.subscriptionStatus,
					plan: tenants.plan,
					trialEndsAt: tenants.trialEndsAt,
					stripeSubscriptionId: tenants.stripeSubscriptionId,
				})
				.from(tenants)
				.where(eq(tenants.id, request.tenantId))
				.limit(1)
				.then((rows) => rows[0])

			if (!tenant) return reply.status(404).send({ error: "Empresa não encontrada" })

			return reply.send({
				status: tenant.subscriptionStatus,
				plan: tenant.plan,
				trialEndsAt: tenant.trialEndsAt,
				stripeSubscriptionId: tenant.stripeSubscriptionId,
			})
		},
	)

	app.post(
		"/billing/checkout",
		{
			preHandler: [authenticate],
			schema: {
				tags: ["Billing"],
				summary: "Create Stripe checkout session",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						plan: { type: "string", enum: ["essential", "premium"] },
					},
				},
				response: {
					200: { type: "object", properties: { url: { type: "string" } } },
					400: errorSchema,
					401: unauthorizedSchema,
					404: notFoundSchema,
					422: unprocessableSchema,
					500: errorSchema,
				},
			},
		},
		async (request, reply) => {
			const result = z.object({ plan: planSchema }).safeParse(request.body)
			if (!result.success) {
				return reply
					.status(400)
					.send({ error: "Plano inválido", details: z.treeifyError(result.error) })
			}

			const stripe = getStripe()
			const priceId =
				result.data.plan === "premium" ? env.STRIPE_PRICE_PREMIUM : env.STRIPE_PRICE_ESSENTIAL

			if (!priceId) {
				return reply.status(500).send({ error: "Plano não configurado no servidor" })
			}

			const tenant = await db
				.select({ name: tenants.name, stripeCustomerId: tenants.stripeCustomerId })
				.from(tenants)
				.where(eq(tenants.id, request.tenantId))
				.limit(1)
				.then((rows) => rows[0])

			if (!tenant) return reply.status(404).send({ error: "Empresa não encontrada" })

			let customerId = tenant.stripeCustomerId

			if (!customerId) {
				const customer = await stripe.customers.create({
					name: tenant.name,
					metadata: { tenantId: request.tenantId },
				})
				customerId = customer.id
				await db
					.update(tenants)
					.set({ stripeCustomerId: customerId })
					.where(eq(tenants.id, request.tenantId))
			}

			const session = await stripe.checkout.sessions.create({
				customer: customerId,
				mode: "subscription",
				line_items: [{ price: priceId, quantity: 1 }],
				success_url: env.STRIPE_SUCCESS_URL,
				cancel_url: env.STRIPE_CANCEL_URL,
				metadata: { tenantId: request.tenantId },
			})

			return reply.send({ url: session.url })
		},
	)

	app.post(
		"/billing/portal",
		{
			preHandler: [authenticate],
			schema: {
				tags: ["Billing"],
				summary: "Open Stripe billing portal",
				security: [{ cookieAuth: [] }],
				response: {
					200: { type: "object", properties: { url: { type: "string" } } },
					400: errorSchema,
					401: unauthorizedSchema,
				},
			},
		},
		async (request, reply) => {
			const tenant = await db
				.select({ stripeCustomerId: tenants.stripeCustomerId })
				.from(tenants)
				.where(eq(tenants.id, request.tenantId))
				.limit(1)
				.then((rows) => rows[0])

			if (!tenant?.stripeCustomerId) {
				return reply.status(400).send({ error: "Nenhuma assinatura ativa encontrada" })
			}

			const stripe = getStripe()
			const session = await stripe.billingPortal.sessions.create({
				customer: tenant.stripeCustomerId,
				return_url: env.STRIPE_CANCEL_URL,
			})

			return reply.send({ url: session.url })
		},
	)

	app.patch(
		"/billing/plan",
		{
			preHandler: [authenticate],
			schema: {
				tags: ["Billing"],
				summary: "Upgrade or downgrade plan",
				security: [{ cookieAuth: [] }],
				body: {
					type: "object",
					properties: {
						plan: { type: "string", enum: ["essential", "premium"] },
					},
				},
				response: {
					200: { type: "object", properties: { message: { type: "string" } } },
					400: errorSchema,
					401: unauthorizedSchema,
					422: unprocessableSchema,
					500: errorSchema,
				},
			},
		},
		async (request, reply) => {
			const result = z.object({ plan: planSchema }).safeParse(request.body)
			if (!result.success) {
				return reply
					.status(400)
					.send({ error: "Plano inválido", details: z.treeifyError(result.error) })
			}

			const tenant = await db
				.select({ plan: tenants.plan, stripeSubscriptionId: tenants.stripeSubscriptionId })
				.from(tenants)
				.where(eq(tenants.id, request.tenantId))
				.limit(1)
				.then((rows) => rows[0])

			if (!tenant?.stripeSubscriptionId) {
				return reply.status(400).send({ error: "Nenhuma assinatura ativa encontrada" })
			}

			const newPlan = result.data.plan
			const priceId = newPlan === "premium" ? env.STRIPE_PRICE_PREMIUM : env.STRIPE_PRICE_ESSENTIAL

			if (!priceId) {
				return reply.status(500).send({ error: "Plano não configurado no servidor" })
			}

			const stripe = getStripe()
			const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId)
			const itemId = subscription.items.data[0]?.id

			if (!itemId) {
				return reply.status(400).send({ error: "Assinatura inválida" })
			}

			const isUpgrade = newPlan === "premium" && tenant.plan === "essential"

			await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
				items: [{ id: itemId, price: priceId }],
				proration_behavior: isUpgrade ? "create_prorations" : "none",
				...(isUpgrade ? {} : { billing_cycle_anchor: "unchanged" as const }),
			})

			if (isUpgrade) {
				await db.update(tenants).set({ plan: newPlan }).where(eq(tenants.id, request.tenantId))
				return reply.send({ message: "Plano atualizado para Premium com sucesso" })
			}

			return reply.send({ message: "Downgrade agendado para o próximo ciclo de cobrança" })
		},
	)
}

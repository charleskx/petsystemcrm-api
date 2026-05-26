import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { getDashboard } from "../../../application/dashboard/get-dashboard.use-case"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { authenticate } from "../middlewares/authenticate"
import { unauthorizedSchema } from "../schemas/shared"

export async function dashboardRoutes(app: FastifyInstance) {
	app.get(
		"/dashboard",
		{
			preHandler: [authenticate],
			schema: {
				tags: ["Dashboard"],
				summary: "Get tenant dashboard metrics",
				security: [{ cookieAuth: [] }],
				response: {
					200: {
						type: "object",
						properties: {
							subscription: {
								type: "object",
								properties: {
									plan: { type: "string", enum: ["essential", "premium"] },
									status: {
										type: "string",
										enum: ["trial", "active", "expired", "cancelled", "past_due"],
									},
									trialEndsAt: { type: "string", format: "date-time", nullable: true },
								},
							},
							today: {
								type: "object",
								properties: {
									appointmentsScheduled: { type: "integer" },
									appointmentsCompleted: { type: "integer" },
									appointmentRevenue: { type: "number" },
								},
							},
							thisMonth: {
								nullable: true,
								type: "object",
								properties: {
									appointmentsCompleted: { type: "integer" },
									appointmentRevenue: { type: "number" },
									newClients: { type: "integer" },
								},
							},
							totals: {
								nullable: true,
								type: "object",
								properties: {
									clients: { type: "integer" },
									pets: { type: "integer" },
									activeProducts: { type: "integer" },
								},
							},
							upcomingAppointments: {
								nullable: true,
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										scheduledAt: { type: "string", format: "date-time" },
										clientName: { type: "string" },
										petName: { type: "string" },
										services: { type: "array", items: { type: "string" } },
									},
								},
							},
							productAlerts: {
								nullable: true,
								type: "object",
								properties: {
									lowStock: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												quantity: { type: "integer" },
												minQuantity: { type: "integer" },
											},
										},
									},
									nearExpiry: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												expiryDate: { type: "string", format: "date-time", nullable: true },
												quantity: { type: "integer" },
											},
										},
									},
								},
							},
							revenueChart: {
								nullable: true,
								type: "array",
								items: {
									type: "object",
									properties: {
										date: { type: "string" },
										appointmentRevenue: { type: "number" },
										salesRevenue: { type: "number", nullable: true },
									},
								},
							},
							salesThisMonth: {
								nullable: true,
								type: "object",
								properties: {
									count: { type: "integer" },
									revenue: { type: "number" },
									byChannel: {
										type: "object",
										properties: {
											in_store: { type: "integer" },
											online: { type: "integer" },
										},
									},
								},
							},
						},
					},
					401: unauthorizedSchema,
				},
			},
		},
		async (request, reply) => {
			const tenant = await db
				.select({
					plan: tenants.plan,
					subscriptionStatus: tenants.subscriptionStatus,
					trialEndsAt: tenants.trialEndsAt,
				})
				.from(tenants)
				.where(eq(tenants.id, request.tenantId))
				.limit(1)
				.then((rows) => rows[0])

			if (!tenant) {
				return reply.status(401).send({ error: "Tenant não encontrado" })
			}

			const data = await getDashboard({
				tenantId: request.tenantId,
				plan: tenant.plan,
				subscriptionStatus: tenant.subscriptionStatus,
				trialEndsAt: tenant.trialEndsAt,
			})

			return reply.send(data)
		},
	)
}

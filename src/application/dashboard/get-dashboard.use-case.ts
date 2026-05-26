import { and, asc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import {
	appointments,
	appointmentServices,
	clients,
	pets,
	products,
	sales,
	services,
} from "../../infra/database/drizzle/schema"

export interface DashboardInput {
	tenantId: string
	plan: "essential" | "premium"
	subscriptionStatus: "trial" | "active" | "expired" | "cancelled" | "past_due"
	trialEndsAt: Date | null
}

export async function getDashboard({ tenantId, plan, subscriptionStatus, trialEndsAt }: DashboardInput) {
	const now = new Date()
	const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
	const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
	const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000)
	const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

	// subscription section — always present (task 1.3)
	const subscription = {
		plan,
		status: subscriptionStatus,
		trialEndsAt: subscriptionStatus === "trial" ? trialEndsAt : undefined,
	}

	// today section — always present (task 1.2)
	const [todayRow] = await db
		.select({
			scheduledCount: sql<string>`count(*) filter (where ${appointments.status} = 'scheduled')`,
			completedCount: sql<string>`count(*) filter (where ${appointments.status} = 'completed')`,
			revenue: sql<string>`coalesce(sum(${appointments.totalAmount}) filter (where ${appointments.status} = 'completed'), 0)`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.tenantId, tenantId),
				gte(appointments.scheduledAt, todayStart),
				lt(appointments.scheduledAt, todayEnd),
			),
		)

	const today = {
		appointmentsScheduled: Number(todayRow.scheduledCount),
		appointmentsCompleted: Number(todayRow.completedCount),
		appointmentRevenue: Number(todayRow.revenue),
	}

	// degraded mode: expired / cancelled (task 1.4)
	if (subscriptionStatus === "expired" || subscriptionStatus === "cancelled") {
		return {
			subscription,
			today,
			thisMonth: null,
			totals: null,
			upcomingAppointments: null,
			productAlerts: null,
			revenueChart: null,
			salesThisMonth: null,
		}
	}

	// full mode — run independent queries in parallel (task 1.11)
	const [
		thisMonthApptRows,
		thisMonthClientsRows,
		clientsCountRows,
		petsCountRows,
		productsCountRows,
		upcomingApptRows,
		lowStockRows,
		nearExpiryRows,
		revenueChartRows,
	] = await Promise.all([
		// task 1.5 — thisMonth appointments
		db
			.select({
				appointmentsCompleted: sql<string>`count(*) filter (where ${appointments.status} = 'completed')`,
				appointmentRevenue: sql<string>`coalesce(sum(${appointments.totalAmount}) filter (where ${appointments.status} = 'completed'), 0)`,
			})
			.from(appointments)
			.where(and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, monthStart))),

		// task 1.5 — new clients this month
		db
			.select({ count: sql<string>`count(*)` })
			.from(clients)
			.where(and(eq(clients.tenantId, tenantId), gte(clients.createdAt, monthStart))),

		// task 1.6 — totals: clients
		db
			.select({ count: sql<string>`count(*)` })
			.from(clients)
			.where(and(eq(clients.tenantId, tenantId), eq(clients.active, true))),

		// task 1.6 — totals: pets
		db.select({ count: sql<string>`count(*)` }).from(pets).where(eq(pets.tenantId, tenantId)),

		// task 1.6 — totals: active products
		db
			.select({ count: sql<string>`count(*)` })
			.from(products)
			.where(and(eq(products.tenantId, tenantId), eq(products.active, true))),

		// task 1.7 — upcoming appointments (next 5 scheduled)
		db
			.select({
				id: appointments.id,
				scheduledAt: appointments.scheduledAt,
				clientName: clients.name,
				petName: pets.name,
			})
			.from(appointments)
			.innerJoin(clients, eq(appointments.clientId, clients.id))
			.innerJoin(pets, eq(appointments.petId, pets.id))
			.where(
				and(
					eq(appointments.tenantId, tenantId),
					eq(appointments.status, "scheduled"),
					gte(appointments.scheduledAt, now),
				),
			)
			.orderBy(asc(appointments.scheduledAt))
			.limit(5),

		// task 1.8 — product alerts: low stock (max 10)
		db
			.select({
				id: products.id,
				name: products.name,
				quantity: products.quantity,
				minQuantity: products.minQuantity,
			})
			.from(products)
			.where(
				and(
					eq(products.tenantId, tenantId),
					eq(products.active, true),
					lte(products.quantity, sql`${products.minQuantity}`),
				),
			)
			.limit(10),

		// task 1.8 — product alerts: near expiry (max 10)
		db
			.select({
				id: products.id,
				name: products.name,
				expiryDate: products.expiryDate,
				quantity: products.quantity,
			})
			.from(products)
			.where(
				and(
					eq(products.tenantId, tenantId),
					eq(products.active, true),
					sql`${products.expiryDate} IS NOT NULL`,
					lte(products.expiryDate, thirtyDaysFromNow),
				),
			)
			.limit(10),

		// task 1.9 — revenue chart: last 30 days, appointments completed
		db
			.select({
				date: sql<string>`to_char(${appointments.scheduledAt}::date, 'YYYY-MM-DD')`,
				appointmentRevenue: sql<string>`sum(${appointments.totalAmount})`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.tenantId, tenantId),
					eq(appointments.status, "completed"),
					gte(appointments.scheduledAt, thirtyDaysAgo),
					lt(appointments.scheduledAt, todayEnd),
				),
			)
			.groupBy(sql`to_char(${appointments.scheduledAt}::date, 'YYYY-MM-DD')`)
			.orderBy(sql`to_char(${appointments.scheduledAt}::date, 'YYYY-MM-DD')`),
	])

	// load services for upcoming appointments (task 1.7)
	const upcomingIds = upcomingApptRows.map((r) => r.id)
	const apptServicesRows =
		upcomingIds.length > 0
			? await db
					.select({
						appointmentId: appointmentServices.appointmentId,
						serviceName: services.name,
					})
					.from(appointmentServices)
					.innerJoin(services, eq(services.id, appointmentServices.serviceId))
					.where(inArray(appointmentServices.appointmentId, upcomingIds))
			: []

	const servicesByApptId = new Map<string, string[]>()
	for (const row of apptServicesRows) {
		const arr = servicesByApptId.get(row.appointmentId) ?? []
		arr.push(row.serviceName)
		servicesByApptId.set(row.appointmentId, arr)
	}

	const upcomingAppointments = upcomingApptRows.map((r) => ({
		id: r.id,
		scheduledAt: r.scheduledAt,
		clientName: r.clientName,
		petName: r.petName,
		services: servicesByApptId.get(r.id) ?? [],
	}))

	// build revenue chart map (task 1.9)
	const revenueChartMap = new Map<string, { appointmentRevenue: number; salesRevenue?: number }>()
	for (const row of revenueChartRows) {
		revenueChartMap.set(row.date, { appointmentRevenue: Number(row.appointmentRevenue) })
	}

	// task 1.10 — premium queries
	let salesThisMonth: { count: number; revenue: number; byChannel: { in_store: number; online: number } } | null = null
	if (plan === "premium") {
		const [salesMonthRows, salesChartRows] = await Promise.all([
			db
				.select({
					count: sql<string>`count(*)`,
					revenue: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
					inStoreCount: sql<string>`count(*) filter (where ${sales.channel} = 'in_store')`,
					onlineCount: sql<string>`count(*) filter (where ${sales.channel} = 'online')`,
				})
				.from(sales)
				.where(
					and(eq(sales.tenantId, tenantId), eq(sales.status, "paid"), gte(sales.createdAt, monthStart)),
				),

			db
				.select({
					date: sql<string>`to_char(${sales.createdAt}::date, 'YYYY-MM-DD')`,
					salesRevenue: sql<string>`sum(${sales.totalAmount})`,
				})
				.from(sales)
				.where(
					and(
						eq(sales.tenantId, tenantId),
						eq(sales.status, "paid"),
						gte(sales.createdAt, thirtyDaysAgo),
						lt(sales.createdAt, todayEnd),
					),
				)
				.groupBy(sql`to_char(${sales.createdAt}::date, 'YYYY-MM-DD')`)
				.orderBy(sql`to_char(${sales.createdAt}::date, 'YYYY-MM-DD')`),
		])

		const salesRow = salesMonthRows[0]
		salesThisMonth = {
			count: Number(salesRow.count),
			revenue: Number(salesRow.revenue),
			byChannel: {
				in_store: Number(salesRow.inStoreCount),
				online: Number(salesRow.onlineCount),
			},
		}

		for (const row of salesChartRows) {
			const existing = revenueChartMap.get(row.date)
			if (existing) {
				existing.salesRevenue = Number(row.salesRevenue)
			} else {
				revenueChartMap.set(row.date, { appointmentRevenue: 0, salesRevenue: Number(row.salesRevenue) })
			}
		}
	}

	const revenueChart = Array.from(revenueChartMap.entries())
		.map(([date, values]) => ({ date, ...values }))
		.sort((a, b) => a.date.localeCompare(b.date))

	return {
		subscription,
		today,
		thisMonth: {
			appointmentsCompleted: Number(thisMonthApptRows[0].appointmentsCompleted),
			appointmentRevenue: Number(thisMonthApptRows[0].appointmentRevenue),
			newClients: Number(thisMonthClientsRows[0].count),
		},
		totals: {
			clients: Number(clientsCountRows[0].count),
			pets: Number(petsCountRows[0].count),
			activeProducts: Number(productsCountRows[0].count),
		},
		upcomingAppointments,
		productAlerts: {
			lowStock: lowStockRows,
			nearExpiry: nearExpiryRows,
		},
		revenueChart,
		salesThisMonth,
	}
}

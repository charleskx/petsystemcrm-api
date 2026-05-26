import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { eq, inArray } from "drizzle-orm"

// Valid CNPJs unique to this test file (root 83, computed check digits)
const CNPJ_ESSENTIAL = "83000000000119"
const CNPJ_PREMIUM = "83000000000208"
const CNPJ_EXPIRED = "83000000000380"
const CNPJ_PAST_DUE = "83000000000461"
const CNPJ_ISOLATION_A = "83000000000542"
const CNPJ_ISOLATION_B = "83000000000623"

const ALL_CNPJS = [
	CNPJ_ESSENTIAL,
	CNPJ_PREMIUM,
	CNPJ_EXPIRED,
	CNPJ_PAST_DUE,
	CNPJ_ISOLATION_A,
	CNPJ_ISOLATION_B,
]

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
}): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `dash-test+${Date.now()}+${Math.random()}@test.com`

	const reg = await app.inject({
		method: "POST",
		url: "/tenants",
		payload: {
			tenantName: "Test Pet Shop",
			document: opts.document,
			documentType: "cnpj",
			userName: "Dono",
			email,
			password: PASSWORD,
		},
	})

	if (reg.statusCode !== 201) {
		throw new Error(`Tenant registration failed (${reg.statusCode}): ${reg.body}`)
	}

	const { tenantId } = reg.json()

	const signIn = await app.inject({
		method: "POST",
		url: "/auth/sign-in/email",
		payload: { email, password: PASSWORD },
	})

	const cookies = signIn.headers["set-cookie"] as string | string[]
	const cookie = Array.isArray(cookies) ? cookies.join("; ") : cookies

	return { cookie, tenantId }
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
	await db.delete(tenants).where(inArray(tenants.document, ALL_CNPJS))
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// 4.2 — essential plan, active subscription
// ---------------------------------------------------------------------------

describe("GET /dashboard — essential plan active", () => {
	let cookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_ESSENTIAL })
		cookie = result.cookie
		tenantId = result.tenantId
		await db
			.update(tenants)
			.set({ subscriptionStatus: "active", plan: "essential" })
			.where(eq(tenants.id, tenantId))
	})

	it("returns 200 with all sections populated and salesThisMonth null", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/dashboard",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()

		expect(body.subscription).toBeDefined()
		expect(body.subscription.plan).toBe("essential")
		expect(body.subscription.status).toBe("active")

		expect(body.today).toBeDefined()
		expect(typeof body.today.appointmentsScheduled).toBe("number")
		expect(typeof body.today.appointmentsCompleted).toBe("number")
		expect(typeof body.today.appointmentRevenue).toBe("number")

		expect(body.thisMonth).not.toBeNull()
		expect(typeof body.thisMonth.appointmentsCompleted).toBe("number")
		expect(typeof body.thisMonth.appointmentRevenue).toBe("number")
		expect(typeof body.thisMonth.newClients).toBe("number")

		expect(body.totals).not.toBeNull()
		expect(typeof body.totals.clients).toBe("number")
		expect(typeof body.totals.pets).toBe("number")
		expect(typeof body.totals.activeProducts).toBe("number")

		expect(Array.isArray(body.upcomingAppointments)).toBe(true)

		expect(body.productAlerts).not.toBeNull()
		expect(Array.isArray(body.productAlerts.lowStock)).toBe(true)
		expect(Array.isArray(body.productAlerts.nearExpiry)).toBe(true)

		expect(Array.isArray(body.revenueChart)).toBe(true)

		expect(body.salesThisMonth).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// 4.3 — premium plan, active subscription
// ---------------------------------------------------------------------------

describe("GET /dashboard — premium plan active", () => {
	let cookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_PREMIUM })
		cookie = result.cookie
		tenantId = result.tenantId
		await db
			.update(tenants)
			.set({ subscriptionStatus: "active", plan: "premium" })
			.where(eq(tenants.id, tenantId))
	})

	it("returns 200 with salesThisMonth present including count, revenue and byChannel", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/dashboard",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()

		expect(body.salesThisMonth).not.toBeNull()
		expect(typeof body.salesThisMonth.count).toBe("number")
		expect(typeof body.salesThisMonth.revenue).toBe("number")
		expect(typeof body.salesThisMonth.byChannel.in_store).toBe("number")
		expect(typeof body.salesThisMonth.byChannel.online).toBe("number")
	})
})

// ---------------------------------------------------------------------------
// 4.4 — expired subscription → degraded mode
// ---------------------------------------------------------------------------

describe("GET /dashboard — expired subscription degraded mode", () => {
	let cookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_EXPIRED })
		cookie = result.cookie
		tenantId = result.tenantId
		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))
	})

	it("returns 200 (not 402) with only subscription and today populated", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/dashboard",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()

		expect(body.subscription).toBeDefined()
		expect(body.subscription.status).toBe("expired")
		expect(body.today).toBeDefined()

		expect(body.thisMonth).toBeNull()
		expect(body.totals).toBeNull()
		expect(body.upcomingAppointments).toBeNull()
		expect(body.productAlerts).toBeNull()
		expect(body.revenueChart).toBeNull()
		expect(body.salesThisMonth).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// 4.5 — past_due subscription → full response (not degraded)
// ---------------------------------------------------------------------------

describe("GET /dashboard — past_due subscription", () => {
	let cookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_PAST_DUE })
		cookie = result.cookie
		tenantId = result.tenantId
		await db
			.update(tenants)
			.set({ subscriptionStatus: "past_due", plan: "essential" })
			.where(eq(tenants.id, tenantId))
	})

	it("returns 200 with full response (all sections populated, not degraded)", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/dashboard",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()

		expect(body.thisMonth).not.toBeNull()
		expect(body.totals).not.toBeNull()
		expect(Array.isArray(body.upcomingAppointments)).toBe(true)
		expect(body.productAlerts).not.toBeNull()
		expect(Array.isArray(body.revenueChart)).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// 4.6 — unauthenticated request → 401
// ---------------------------------------------------------------------------

describe("GET /dashboard — unauthenticated", () => {
	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/dashboard",
		})
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// 4.7 — tenant isolation
// ---------------------------------------------------------------------------

describe("GET /dashboard — tenant isolation", () => {
	let cookieA: string
	let cookieB: string
	let tenantIdA: string
	let tenantIdB: string

	beforeAll(async () => {
		const resultA = await createTenantAndLogin({ document: CNPJ_ISOLATION_A })
		cookieA = resultA.cookie
		tenantIdA = resultA.tenantId

		const resultB = await createTenantAndLogin({ document: CNPJ_ISOLATION_B })
		cookieB = resultB.cookie
		tenantIdB = resultB.tenantId

		await db.update(tenants).set({ subscriptionStatus: "active" }).where(eq(tenants.id, tenantIdA))
		await db.update(tenants).set({ subscriptionStatus: "active" }).where(eq(tenants.id, tenantIdB))

		// Create a client for tenant A only
		await app.inject({
			method: "POST",
			url: "/clients",
			headers: { cookie: cookieA },
			payload: {
				name: "Cliente Isolation A",
				phone: "11999990001",
				addressZip: "01310100",
				addressStreet: "Avenida Paulista",
				addressNumber: "100",
				addressNeighborhood: "Bela Vista",
				addressCity: "São Paulo",
				addressState: "SP",
			},
		})
	})

	it("tenant B does not see tenant A clients in totals", async () => {
		const [responseA, responseB] = await Promise.all([
			app.inject({ method: "GET", url: "/dashboard", headers: { cookie: cookieA } }),
			app.inject({ method: "GET", url: "/dashboard", headers: { cookie: cookieB } }),
		])

		expect(responseA.statusCode).toBe(200)
		expect(responseB.statusCode).toBe(200)

		const bodyA = responseA.json()
		const bodyB = responseB.json()

		expect(bodyA.totals.clients).toBeGreaterThanOrEqual(1)
		expect(bodyB.totals.clients).toBe(0)
	})
})

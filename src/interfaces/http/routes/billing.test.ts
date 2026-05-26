import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { eq, inArray } from "drizzle-orm"

// Valid CNPJs unique to this test file (computed with correct check digits)
const CNPJ_SUBSCRIPTION = "72000000001093"
const CNPJ_CHECKOUT = "72000000001174"
const CNPJ_PORTAL = "72000000001255"
const CNPJ_PLAN = "72000000001336"
const CNPJ_GUARD_EXPIRED = "72000000001417"
const CNPJ_GUARD_CANCELLED = "72000000001506"
const CNPJ_GUARD_ESSENTIAL_SUPPLIERS = "72000000001689"
const CNPJ_GUARD_ESSENTIAL_SALES = "72000000001760"
const CNPJ_GUARD_TRIAL = "72000000001840"
const CNPJ_GUARD_PAST_DUE = "72000000001921"
const CNPJ_WEBHOOK = "72000000002065"

const ALL_CNPJS = [
	CNPJ_SUBSCRIPTION,
	CNPJ_CHECKOUT,
	CNPJ_PORTAL,
	CNPJ_PLAN,
	CNPJ_GUARD_EXPIRED,
	CNPJ_GUARD_CANCELLED,
	CNPJ_GUARD_ESSENTIAL_SUPPLIERS,
	CNPJ_GUARD_ESSENTIAL_SALES,
	CNPJ_GUARD_TRIAL,
	CNPJ_GUARD_PAST_DUE,
	CNPJ_WEBHOOK,
]

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
}): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `billing-test+${Date.now()}+${Math.random()}@test.com`

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
	await db.delete(tenants).where(inArray(tenants.document, ALL_CNPJS))
	await app.close()
})

// ---------------------------------------------------------------------------
// GET /billing/subscription
// ---------------------------------------------------------------------------

describe("GET /billing/subscription", () => {
	let cookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_SUBSCRIPTION })
		cookie = result.cookie
		tenantId = result.tenantId
	})

	it("returns 200 with subscription details for trial tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/billing/subscription",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.status).toBe("trial")
		expect(body.plan).toBe("essential")
		expect(body).toHaveProperty("trialEndsAt")
	})

	it("returns subscription details for active tenant", async () => {
		await db
			.update(tenants)
			.set({ subscriptionStatus: "active", plan: "premium" })
			.where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/billing/subscription",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.status).toBe("active")
		expect(body.plan).toBe("premium")
	})

	it("returns 200 even when subscription is expired (guard bypass)", async () => {
		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/billing/subscription",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.status).toBe("expired")
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: "/billing/subscription" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// POST /billing/checkout
// ---------------------------------------------------------------------------

describe("POST /billing/checkout", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_CHECKOUT })
		cookie = result.cookie
	})

	it("returns 400 for invalid plan value", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/billing/checkout",
			headers: { cookie },
			payload: { plan: "enterprise" },
		})

		expect(response.statusCode).toBe(400)
	})

	it("returns 400 for missing plan", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/billing/checkout",
			headers: { cookie },
			payload: {},
		})

		expect(response.statusCode).toBe(400)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/billing/checkout",
			payload: { plan: "premium" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// POST /billing/portal
// ---------------------------------------------------------------------------

describe("POST /billing/portal", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_PORTAL })
		cookie = result.cookie
	})

	it("returns 400 when tenant has no stripeCustomerId", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/billing/portal",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(400)
		const body = response.json()
		expect(body.error).toBe("Nenhuma assinatura ativa encontrada")
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "POST", url: "/billing/portal" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// PATCH /billing/plan
// ---------------------------------------------------------------------------

describe("PATCH /billing/plan", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_PLAN })
		cookie = result.cookie
	})

	it("returns 400 when tenant has no stripeSubscriptionId", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/billing/plan",
			headers: { cookie },
			payload: { plan: "premium" },
		})

		expect(response.statusCode).toBe(400)
		const body = response.json()
		expect(body.error).toBe("Nenhuma assinatura ativa encontrada")
	})

	it("returns 400 for invalid plan value", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/billing/plan",
			headers: { cookie },
			payload: { plan: "gold" },
		})

		expect(response.statusCode).toBe(400)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/billing/plan",
			payload: { plan: "premium" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// Subscription guard: expired and cancelled tenants
// ---------------------------------------------------------------------------

describe("subscription guard — expired tenant", () => {
	it("returns 402 on operational route when subscription is expired", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_GUARD_EXPIRED })

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/clients",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(402)
	})
})

describe("subscription guard — cancelled tenant", () => {
	it("returns 402 on operational route when subscription is cancelled", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_GUARD_CANCELLED })

		await db.update(tenants).set({ subscriptionStatus: "cancelled" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/appointments",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(402)
	})
})

describe("subscription guard — essential plan blocks premium routes", () => {
	it("returns 403 on /suppliers for active essential tenant", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_GUARD_ESSENTIAL_SUPPLIERS })

		await db
			.update(tenants)
			.set({ subscriptionStatus: "active", plan: "essential" })
			.where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/suppliers",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(403)
	})

	it("returns 403 on /sales for active essential tenant", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_GUARD_ESSENTIAL_SALES })

		await db
			.update(tenants)
			.set({ subscriptionStatus: "active", plan: "essential" })
			.where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/sales",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(403)
	})
})

describe("subscription guard — active trial has full access", () => {
	it("allows access to premium route during active trial", async () => {
		const { cookie } = await createTenantAndLogin({ document: CNPJ_GUARD_TRIAL })

		const response = await app.inject({
			method: "GET",
			url: "/suppliers",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
	})
})

describe("subscription guard — past_due tenant retains access", () => {
	it("allows access when subscription is past_due", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_GUARD_PAST_DUE })

		await db.update(tenants).set({ subscriptionStatus: "past_due" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/clients",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
	})
})

// ---------------------------------------------------------------------------
// POST /payments/stripe/webhook
// ---------------------------------------------------------------------------

describe("POST /payments/stripe/webhook", () => {
	it("returns 400 with missing stripe-signature", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/payments/stripe/webhook",
			headers: { "content-type": "application/json" },
			payload: JSON.stringify({ type: "checkout.session.completed" }),
		})

		expect(response.statusCode).toBe(400)
		const body = response.json()
		expect(body.error).toBe("Assinatura do webhook inválida")
	})

	it("returns 400 with invalid stripe-signature", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/payments/stripe/webhook",
			headers: {
				"content-type": "application/json",
				"stripe-signature": "t=invalid,v1=badsig",
			},
			payload: JSON.stringify({ type: "checkout.session.completed" }),
		})

		expect(response.statusCode).toBe(400)
	})
})

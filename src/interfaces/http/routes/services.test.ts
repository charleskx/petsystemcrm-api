import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants, tenantInvitations } from "../../../infra/database/drizzle/schema"
import { eq } from "drizzle-orm"

let app: FastifyInstance

// Valid CNPJs — unique to this file, non-conflicting with other test files
// Computed via CNPJ check-digit algorithm in src/domain/shared/document.validator.ts
const CNPJ_CREATE = "12001001000130"
const CNPJ_CREATE_OTHER = "13002002000242"
const CNPJ_LIST = "14003003000355"
const CNPJ_LIST_OTHER = "15004004000468"
const CNPJ_CRUD_SELF = "16005005000570"
const CNPJ_CRUD_OTHER = "17006006000683"
const CNPJ_PRICING_SELF = "18007007000796"
const CNPJ_PRICING_OTHER = "19008008000807"
const CNPJ_COLLAB = "20009009000928"
const CNPJ_SUBSCRIPTION = "21001001001011"

const PASSWORD = "senha1234"

async function createTenantAndLogin(
	app: FastifyInstance,
	opts: { document: string; email?: string },
): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `svc-test+${Date.now()}+${Math.random()}@test.com`

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

async function addCollaborator(
	app: FastifyInstance,
	ownerCookie: string,
	tenantId: string,
	email: string,
): Promise<string> {
	await app.inject({
		method: "POST",
		url: `/tenants/${tenantId}/members/invite`,
		headers: { cookie: ownerCookie },
		payload: { email, role: "collaborator" },
	})

	const signIn = await app.inject({
		method: "POST",
		url: "/auth/sign-in/email",
		payload: { email, password: PASSWORD },
	})

	const cookies = signIn.headers["set-cookie"] as string | string[]
	return Array.isArray(cookies) ? cookies.join("; ") : cookies
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// POST /services
// ---------------------------------------------------------------------------

describe("POST /services", () => {
	let cookie: string
	let otherCookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_CREATE })
		cookie = result.cookie

		const other = await createTenantAndLogin(app, { document: CNPJ_CREATE_OTHER })
		otherCookie = other.cookie
	})

	it("creates service and returns 201", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { name: "Banho", durationMinutes: 60 },
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.name).toBe("Banho")
		expect(body.durationMinutes).toBe(60)
		expect(body.active).toBe(true)
	})

	it("creates service with description and active=false", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { name: "Tosa", durationMinutes: 90, description: "Tosa completa", active: false },
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body.description).toBe("Tosa completa")
		expect(body.active).toBe(false)
	})

	it("returns 422 for missing name", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { durationMinutes: 30 },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for missing durationMinutes", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { name: "Banho" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for durationMinutes = 0", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { name: "Banho", durationMinutes: 0 },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			payload: { name: "Banho", durationMinutes: 60 },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /services
// ---------------------------------------------------------------------------

describe("GET /services", () => {
	let cookie: string
	let otherCookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_LIST })
		cookie = result.cookie

		const other = await createTenantAndLogin(app, { document: CNPJ_LIST_OTHER })
		otherCookie = other.cookie

		for (const name of ["Banho", "Tosa", "Consulta"]) {
			await app.inject({
				method: "POST",
				url: "/services",
				headers: { cookie },
				payload: { name, durationMinutes: 30 },
			})
		}

		await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie: otherCookie },
			payload: { name: "Serviço de outro tenant", durationMinutes: 30 },
		})
	})

	it("returns 200 with array of services ordered by name", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/services",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBeGreaterThanOrEqual(3)

		const names = body.map((s: { name: string }) => s.name)
		expect([...names].sort()).toEqual(names)
	})

	it("does not return services from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/services",
			headers: { cookie },
		})

		const body = response.json()
		const hasOther = body.some((s: { name: string }) => s.name === "Serviço de outro tenant")
		expect(hasOther).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// GET /services/:id, PATCH /services/:id, DELETE /services/:id
// ---------------------------------------------------------------------------

describe("GET, PATCH, DELETE /services/:id", () => {
	let cookie: string
	let otherCookie: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_CRUD_SELF })
		cookie = result.cookie

		const other = await createTenantAndLogin(app, { document: CNPJ_CRUD_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { name: "Banho e Tosa", durationMinutes: 120 },
		})
		serviceId = created.json().id
	})

	it("GET /services/:id — returns 200 with service", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/services/${serviceId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().id).toBe(serviceId)
	})

	it("GET /services/:id — returns 404 for service from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/services/${serviceId}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("GET /services/:id — returns 404 for non-existent service", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/services/00000000-0000-0000-0000-000000000000",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("PATCH /services/:id — updates fields and returns 200", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/services/${serviceId}`,
			headers: { cookie },
			payload: { name: "Banho Completo", durationMinutes: 90 },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.name).toBe("Banho Completo")
		expect(body.durationMinutes).toBe(90)
	})

	it("PATCH /services/:id — returns 422 for invalid durationMinutes", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/services/${serviceId}`,
			headers: { cookie },
			payload: { durationMinutes: -5 },
		})

		expect(response.statusCode).toBe(422)
	})

	it("PATCH /services/:id — returns 404 for service from another tenant", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/services/${serviceId}`,
			headers: { cookie: otherCookie },
			payload: { name: "Hacked" },
		})

		expect(response.statusCode).toBe(404)
	})

	it("DELETE /services/:id — deletes and returns 204", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/services/${serviceId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(204)
	})

	it("DELETE /services/:id — returns 404 after deletion", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/services/${serviceId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// GET /services/:id/pricing + PUT /services/:id/pricing
// ---------------------------------------------------------------------------

describe("GET and PUT /services/:id/pricing", () => {
	let cookie: string
	let otherCookie: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_PRICING_SELF })
		cookie = result.cookie

		const other = await createTenantAndLogin(app, { document: CNPJ_PRICING_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie },
			payload: { name: "Tosa", durationMinutes: 60 },
		})
		serviceId = created.json().id
	})

	it("GET /services/:id/pricing — returns empty array before any pricing set", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("PUT /services/:id/pricing — sets tiers and returns 200", async () => {
		const response = await app.inject({
			method: "PUT",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie },
			payload: [
				{ petSize: "small", price: "40.00" },
				{ petSize: "medium", price: "60.00" },
				{ petSize: "large", price: "80.00" },
			],
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.length).toBe(3)
		expect(body.some((t: { petSize: string }) => t.petSize === "small")).toBe(true)
	})

	it("GET /services/:id/pricing — returns tiers after PUT", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.length).toBe(3)
	})

	it("PUT /services/:id/pricing — replaces all existing tiers", async () => {
		const response = await app.inject({
			method: "PUT",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie },
			payload: [{ petSize: "extra_large", price: "100.00" }],
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.length).toBe(1)
		expect(body[0].petSize).toBe("extra_large")
	})

	it("PUT /services/:id/pricing — returns 422 for empty array", async () => {
		const response = await app.inject({
			method: "PUT",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie },
			payload: [],
		})

		expect(response.statusCode).toBe(422)
	})

	it("PUT /services/:id/pricing — returns 422 for duplicate pet sizes", async () => {
		const response = await app.inject({
			method: "PUT",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie },
			payload: [
				{ petSize: "small", price: "40.00" },
				{ petSize: "small", price: "50.00" },
			],
		})

		expect(response.statusCode).toBe(422)
	})

	it("PUT /services/:id/pricing — returns 404 for service from another tenant", async () => {
		const response = await app.inject({
			method: "PUT",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie: otherCookie },
			payload: [{ petSize: "small", price: "40.00" }],
		})

		expect(response.statusCode).toBe(404)
	})

	it("GET /services/:id/pricing — returns 404 for service from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// Authorization: collaborator cannot mutate
// ---------------------------------------------------------------------------

describe("collaborator authorization", () => {
	let ownerCookie: string
	let collaboratorCookie: string
	let tenantId: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_COLLAB })
		ownerCookie = result.cookie
		tenantId = result.tenantId

		const collabEmail = `collab-svc+${Date.now()}@test.com`

		const inviteRes = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: collabEmail, role: "collaborator" },
		})

		if (inviteRes.statusCode === 202 && inviteRes.json().status === "invited") {
			// New user — retrieve the invite token and accept the invite to create the account
			const invitation = await db
				.select()
				.from(tenantInvitations)
				.where(eq(tenantInvitations.email, collabEmail))
				.limit(1)
				.then((rows) => rows[0])

			await app.inject({
				method: "POST",
				url: `/tenants/${tenantId}/members/accept-invite?token=${invitation.token}`,
				payload: { name: "Collaborator User", password: PASSWORD },
			})
		}

		const signIn = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email: collabEmail, password: PASSWORD },
		})
		const cookies = signIn.headers["set-cookie"] as string | string[]
		collaboratorCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies

		const created = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie: ownerCookie },
			payload: { name: "Serviço Collab", durationMinutes: 30 },
		})
		serviceId = created.json().id
	})

	it("collaborator can list services (GET /services)", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/services",
			headers: { cookie: collaboratorCookie },
		})

		expect(response.statusCode).toBe(200)
	})

	it("collaborator can get a service (GET /services/:id)", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/services/${serviceId}`,
			headers: { cookie: collaboratorCookie },
		})

		expect(response.statusCode).toBe(200)
	})

	it("collaborator cannot create a service — returns 403", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/services",
			headers: { cookie: collaboratorCookie },
			payload: { name: "Novo Serviço", durationMinutes: 30 },
		})

		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot update a service — returns 403", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/services/${serviceId}`,
			headers: { cookie: collaboratorCookie },
			payload: { name: "Hackeado" },
		})

		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot delete a service — returns 403", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/services/${serviceId}`,
			headers: { cookie: collaboratorCookie },
		})

		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot update pricing — returns 403", async () => {
		const response = await app.inject({
			method: "PUT",
			url: `/services/${serviceId}/pricing`,
			headers: { cookie: collaboratorCookie },
			payload: [{ petSize: "small", price: "40.00" }],
		})

		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// subscription-guard: 402 for expired tenant
// ---------------------------------------------------------------------------

describe("subscription-guard on services", () => {
	it("returns 402 for tenant with expired subscription", async () => {
		const { cookie, tenantId } = await createTenantAndLogin(app, { document: CNPJ_SUBSCRIPTION })

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/services",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(402)
	})
})

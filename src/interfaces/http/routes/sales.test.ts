import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants, tenantMembers, tenantInvitations } from "../../../infra/database/drizzle/schema"
import { and, eq } from "drizzle-orm"

// Valid CNPJs unique to this test file (computed with correct check digits, root 45000000 branches 0010..0017)
const CNPJ_CREATE = "45000000001010"
const CNPJ_CREATE_STOCK = "45000000001100"
const CNPJ_LIST = "45000000001282"
const CNPJ_GET = "45000000001363"
const CNPJ_GET_OTHER = "45000000001444"
const CNPJ_STATUS = "45000000001525"
const CNPJ_COLLAB = "45000000001606"
const CNPJ_PREMIUM = "45000000001797"

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
}): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `sales-test+${Date.now()}+${Math.random()}@test.com`

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

async function createProduct(cookie: string, initialQuantity = 100): Promise<string> {
	const res = await app.inject({
		method: "POST",
		url: "/products",
		headers: { cookie },
		payload: {
			name: "Produto Teste",
			unitType: "unit",
			costPrice: "10.00",
			marginPercent: "50.00",
			minQuantity: 5,
		},
	})
	if (res.statusCode !== 201) throw new Error(`Product creation failed: ${res.body}`)
	const productId = res.json().id

	if (initialQuantity > 0) {
		const stockRes = await app.inject({
			method: "POST",
			url: "/stock/movements",
			headers: { cookie },
			payload: { productId, type: "in", quantity: initialQuantity, reason: "Estoque inicial de teste" },
		})
		if (stockRes.statusCode !== 201) throw new Error(`Stock movement failed: ${stockRes.body}`)
	}

	return productId
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// POST /sales — basic creation
// ---------------------------------------------------------------------------

describe("POST /sales", () => {
	let cookie: string
	let productId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_CREATE })
		cookie = result.cookie
		productId = await createProduct(cookie)
	})

	it("creates sale and returns 201 with sale and items", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: {
				paymentMethod: "cash",
				items: [{ productId, quantity: 2 }],
			},
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("sale")
		expect(body).toHaveProperty("items")
		expect(body.sale.status).toBe("pending")
		expect(body.sale.paymentMethod).toBe("cash")
		expect(body.items).toHaveLength(1)
		expect(body.items[0].productId).toBe(productId)
		expect(body.items[0].quantity).toBe(2)
	})

	it("returns 422 with empty items array", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: {
				paymentMethod: "cash",
				items: [],
			},
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for non-existent product", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: {
				paymentMethod: "pix",
				items: [{ productId: "non-existent-product-id", quantity: 1 }],
			},
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/sales",
			payload: { paymentMethod: "cash", items: [{ productId, quantity: 1 }] },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// POST /sales — stock deduction
// ---------------------------------------------------------------------------

describe("POST /sales — stock deduction", () => {
	let cookie: string
	let productId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_CREATE_STOCK })
		cookie = result.cookie
		productId = await createProduct(cookie, 10)
	})

	it("debits stock on successful sale", async () => {
		const before = await app.inject({ method: "GET", url: `/products/${productId}`, headers: { cookie } })
		const quantityBefore = before.json().quantity

		await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: {
				paymentMethod: "pix",
				items: [{ productId, quantity: 3 }],
			},
		})

		const after = await app.inject({ method: "GET", url: `/products/${productId}`, headers: { cookie } })
		expect(after.json().quantity).toBe(quantityBefore - 3)
	})

	it("returns 422 and does not debit when stock is insufficient", async () => {
		const before = await app.inject({ method: "GET", url: `/products/${productId}`, headers: { cookie } })
		const quantityBefore = before.json().quantity

		const response = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: {
				paymentMethod: "pix",
				items: [{ productId, quantity: 9999 }],
			},
		})

		expect(response.statusCode).toBe(422)

		const after = await app.inject({ method: "GET", url: `/products/${productId}`, headers: { cookie } })
		expect(after.json().quantity).toBe(quantityBefore)
	})
})

// ---------------------------------------------------------------------------
// GET /sales
// ---------------------------------------------------------------------------

describe("GET /sales", () => {
	let cookie: string
	let productId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_LIST })
		cookie = result.cookie
		productId = await createProduct(cookie, 50)

		for (const paymentMethod of ["cash", "pix", "credit_card"] as const) {
			await app.inject({
				method: "POST",
				url: "/sales",
				headers: { cookie },
				payload: { paymentMethod, items: [{ productId, quantity: 1 }] },
			})
		}
	})

	it("returns 200 with paginated sales", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/sales",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("data")
		expect(body).toHaveProperty("total")
		expect(body).toHaveProperty("page")
		expect(body).toHaveProperty("limit")
		expect(body.data.length).toBeGreaterThanOrEqual(3)
	})

	it("filters by status", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/sales?status=pending",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.every((s: { status: string }) => s.status === "pending")).toBe(true)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: "/sales" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /sales/:id
// ---------------------------------------------------------------------------

describe("GET /sales/:id", () => {
	let cookie: string
	let otherCookie: string
	let saleId: string
	let productId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_GET })
		cookie = result.cookie
		productId = await createProduct(cookie, 20)

		const other = await createTenantAndLogin({ document: CNPJ_GET_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: { paymentMethod: "cash", items: [{ productId, quantity: 1 }] },
		})
		saleId = created.json().sale.id
	})

	it("returns 200 with sale and items", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/sales/${saleId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("sale")
		expect(body).toHaveProperty("items")
		expect(body.sale.id).toBe(saleId)
	})

	it("returns 404 for non-existent sale", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/sales/non-existent-id",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("returns 404 when sale belongs to another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/sales/${saleId}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// PATCH /sales/:id/status
// ---------------------------------------------------------------------------

describe("PATCH /sales/:id/status", () => {
	let cookie: string
	let productId: string

	async function createSale() {
		const res = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie },
			payload: { paymentMethod: "cash", items: [{ productId, quantity: 1 }] },
		})
		return res.json().sale.id as string
	}

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_STATUS })
		cookie = result.cookie
		productId = await createProduct(cookie, 100)
	})

	it("transitions pending sale to paid and returns 200", async () => {
		const saleId = await createSale()

		const response = await app.inject({
			method: "PATCH",
			url: `/sales/${saleId}/status`,
			headers: { cookie },
			payload: { status: "paid" },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().status).toBe("paid")
	})

	it("transitions pending sale to cancelled and returns 200", async () => {
		const saleId = await createSale()

		const response = await app.inject({
			method: "PATCH",
			url: `/sales/${saleId}/status`,
			headers: { cookie },
			payload: { status: "cancelled" },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().status).toBe("cancelled")
	})

	it("returns 409 when trying to change a paid sale", async () => {
		const saleId = await createSale()
		await app.inject({
			method: "PATCH",
			url: `/sales/${saleId}/status`,
			headers: { cookie },
			payload: { status: "paid" },
		})

		const response = await app.inject({
			method: "PATCH",
			url: `/sales/${saleId}/status`,
			headers: { cookie },
			payload: { status: "cancelled" },
		})

		expect(response.statusCode).toBe(409)
	})

	it("returns 404 for non-existent sale", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/sales/non-existent-id/status",
			headers: { cookie },
			payload: { status: "paid" },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// Role authorization: collaborator is blocked from write operations
// ---------------------------------------------------------------------------

describe("role authorization on /sales", () => {
	let ownerCookie: string
	let collaboratorCookie: string
	let tenantId: string
	let productId: string
	let saleId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_COLLAB })
		ownerCookie = result.cookie
		tenantId = result.tenantId

		productId = await createProduct(ownerCookie, 50)

		const saleRes = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie: ownerCookie },
			payload: { paymentMethod: "cash", items: [{ productId, quantity: 1 }] },
		})
		saleId = saleRes.json().sale.id

		const collabEmail = `collab-sales+${Date.now()}@test.com`

		await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: collabEmail, role: "collaborator" },
		})

		const invRecord = await db
			.select()
			.from(tenantInvitations)
			.where(and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.email, collabEmail)))
			.limit(1)
			.then((rows) => rows[0])

		if (!invRecord) return

		await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/accept-invite?token=${invRecord.token}`,
			payload: { name: "Collab User", password: PASSWORD },
		})

		const signIn = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email: collabEmail, password: PASSWORD },
		})
		const cookies = signIn.headers["set-cookie"] as string | string[]
		collaboratorCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies
	})

	it("collaborator can GET /sales — returns 200", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/sales",
			headers: { cookie: collaboratorCookie },
		})
		expect(response.statusCode).toBe(200)
	})

	it("collaborator cannot POST /sales — returns 403", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/sales",
			headers: { cookie: collaboratorCookie },
			payload: { paymentMethod: "cash", items: [{ productId, quantity: 1 }] },
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot PATCH /sales/:id/status — returns 403", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/sales/${saleId}/status`,
			headers: { cookie: collaboratorCookie },
			payload: { status: "paid" },
		})
		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// Premium plan guard
// ---------------------------------------------------------------------------

describe("premium guard on /sales", () => {
	it("returns 403 for tenant with active essential plan", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_PREMIUM })

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

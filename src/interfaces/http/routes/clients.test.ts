import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { eq } from "drizzle-orm"

let app: FastifyInstance

// Valid CNPJs — unique to this file, non-conflicting with other test files
// Computed via CNPJ check-digit algorithm in src/domain/shared/document.validator.ts
const CNPJ_POST_CREATE = "29001189000119"
const CNPJ_POST_CPF = "13046720000130"
const CNPJ_POST_MISSING = "55700089000190"
const CNPJ_LIST_SELF = "76100045000108"
const CNPJ_LIST_OTHER = "88900001000133"
const CNPJ_CRUD_SELF = "40100001000122"
const CNPJ_CRUD_OTHER = "10002001000129"
const CNPJ_AUTOCOMPLETE = "37422814000124"
const CNPJ_SUBSCRIPTION = "82006527000198"

const PASSWORD = "senha1234"

const baseAddress = {
	addressZip: "01310100",
	addressStreet: "Avenida Paulista",
	addressNumber: "1000",
	addressNeighborhood: "Bela Vista",
	addressCity: "São Paulo",
	addressState: "SP",
}

async function createTenantAndLogin(
	app: FastifyInstance,
	opts: { document: string; email?: string },
): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `client-test+${Date.now()}+${Math.random()}@test.com`

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
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// POST /clients
// ---------------------------------------------------------------------------

describe("POST /clients", () => {
	it("creates client and returns 201", async () => {
		const { cookie } = await createTenantAndLogin(app, {
			document: CNPJ_POST_CREATE,
			email: `post-create+${Date.now()}@test.com`,
		})

		const response = await app.inject({
			method: "POST",
			url: "/clients",
			headers: { cookie },
			payload: {
				name: "João Silva",
				phone: "11999990000",
				...baseAddress,
			},
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.name).toBe("João Silva")
		expect(body.active).toBe(true)
	})

	it("returns 422 for invalid CPF", async () => {
		const { cookie } = await createTenantAndLogin(app, {
			document: CNPJ_POST_CPF,
			email: `post-cpf-invalid+${Date.now()}@test.com`,
		})

		const response = await app.inject({
			method: "POST",
			url: "/clients",
			headers: { cookie },
			payload: {
				name: "Cliente CPF Inválido",
				phone: "11999990001",
				document: "11111111111",
				...baseAddress,
			},
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for missing required fields", async () => {
		const { cookie } = await createTenantAndLogin(app, {
			document: CNPJ_POST_MISSING,
			email: `post-missing+${Date.now()}@test.com`,
		})

		const response = await app.inject({
			method: "POST",
			url: "/clients",
			headers: { cookie },
			payload: { name: "Sem telefone" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/clients",
			payload: {
				name: "Sem Auth",
				phone: "11999990002",
				...baseAddress,
			},
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /clients
// ---------------------------------------------------------------------------

describe("GET /clients", () => {
	let cookie: string
	let otherCookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, {
			document: CNPJ_LIST_SELF,
			email: `list-owner+${Date.now()}@test.com`,
		})
		cookie = result.cookie

		const other = await createTenantAndLogin(app, {
			document: CNPJ_LIST_OTHER,
			email: `list-other+${Date.now()}@test.com`,
		})
		otherCookie = other.cookie

		for (const name of ["Rex Shop", "Mia Pet", "Tom Vet"]) {
			await app.inject({
				method: "POST",
				url: "/clients",
				headers: { cookie },
				payload: { name, phone: "11900000001", ...baseAddress },
			})
		}

		await app.inject({
			method: "POST",
			url: "/clients",
			headers: { cookie: otherCookie },
			payload: { name: "Other Tenant Client", phone: "11900000002", ...baseAddress },
		})
	})

	it("returns 200 with pagination fields", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("data")
		expect(body).toHaveProperty("total")
		expect(body).toHaveProperty("page")
		expect(body).toHaveProperty("limit")
		expect(Array.isArray(body.data)).toBe(true)
	})

	it("filters by name (case-insensitive)", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients?name=rex",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.length).toBeGreaterThan(0)
		expect(body.data.every((c: { name: string }) => c.name.toLowerCase().includes("rex"))).toBe(true)
	})

	it("respects tenant isolation", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients",
			headers: { cookie },
		})

		const body = response.json()
		expect(body.data.every((c: { name: string }) => c.name !== "Other Tenant Client")).toBe(true)
	})

	it("paginates correctly", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients?page=1&limit=2",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.length).toBeLessThanOrEqual(2)
		expect(body.limit).toBe(2)
		expect(body.page).toBe(1)
	})
})

// ---------------------------------------------------------------------------
// GET /clients/:id, PATCH /clients/:id, DELETE /clients/:id
// ---------------------------------------------------------------------------

describe("GET, PATCH, DELETE /clients/:id", () => {
	let cookie: string
	let otherCookie: string
	let clientId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, {
			document: CNPJ_CRUD_SELF,
			email: `crud-owner+${Date.now()}@test.com`,
		})
		cookie = result.cookie

		const other = await createTenantAndLogin(app, {
			document: CNPJ_CRUD_OTHER,
			email: `crud-other+${Date.now()}@test.com`,
		})
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: "/clients",
			headers: { cookie },
			payload: { name: "Cliente CRUD", phone: "11988880000", ...baseAddress },
		})
		clientId = created.json().id
	})

	it("GET /clients/:id — returns 200 with client data", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().id).toBe(clientId)
	})

	it("GET /clients/:id — returns 404 for client from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("GET /clients/:id — returns 404 for non-existent client", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients/00000000-0000-0000-0000-000000000000",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("PATCH /clients/:id — updates fields and returns 200", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/clients/${clientId}`,
			headers: { cookie },
			payload: { name: "Cliente Atualizado" },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().name).toBe("Cliente Atualizado")
	})

	it("PATCH /clients/:id — returns 422 for invalid CPF", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/clients/${clientId}`,
			headers: { cookie },
			payload: { document: "11111111111" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("PATCH /clients/:id — returns 404 for client from another tenant", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/clients/${clientId}`,
			headers: { cookie: otherCookie },
			payload: { name: "Hacked" },
		})

		expect(response.statusCode).toBe(404)
	})

	it("DELETE /clients/:id — soft deletes and returns 204", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/clients/${clientId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(204)
	})

	it("DELETE /clients/:id — returns 404 when already inactive", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/clients/${clientId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("GET /clients/:id — returns 404 after soft delete", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// GET /clients/address/autocomplete
// ---------------------------------------------------------------------------

describe("GET /clients/address/autocomplete", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, {
			document: CNPJ_AUTOCOMPLETE,
			email: `autocomplete+${Date.now()}@test.com`,
		})
		cookie = result.cookie
	})

	it("returns 422 when q is less than 3 characters", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients/address/autocomplete?q=Ru",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when q is absent", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients/address/autocomplete",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 503 when GOOGLE_MAPS_API_KEY is not set, or 200 when it is", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients/address/autocomplete?q=Rua das Flores",
			headers: { cookie },
		})

		expect([200, 503]).toContain(response.statusCode)
		if (response.statusCode === 503) {
			expect(response.json().error).toMatch(/indispon/i)
		}
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/clients/address/autocomplete?q=Rua das Flores",
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// subscription-guard: 402 for expired tenant
// ---------------------------------------------------------------------------

describe("subscription-guard", () => {
	it("returns 402 for tenant with expired subscription", async () => {
		const { cookie, tenantId } = await createTenantAndLogin(app, {
			document: CNPJ_SUBSCRIPTION,
			email: `expired+${Date.now()}@test.com`,
		})

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/clients",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(402)
	})
})

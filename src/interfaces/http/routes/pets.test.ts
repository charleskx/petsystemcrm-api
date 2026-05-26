import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { db } from "../../../infra/database/drizzle/client"
import { tenants } from "../../../infra/database/drizzle/schema"
import { buildApp } from "../../../main/server"

let app: FastifyInstance

// Valid CNPJs — unique to this file, non-conflicting with other test files
// Computed via CNPJ check-digit algorithm in src/domain/shared/document.validator.ts
const CNPJ_CREATE = "65300052000129"
const CNPJ_CREATE_OTHER = "53700064000161"
const CNPJ_LIST_SELF = "30800047000109"
const CNPJ_LIST_OTHER = "19100027000184"
const CNPJ_CRUD_SELF = "47200031000150"
const CNPJ_CRUD_OTHER = "58300012000111"
const CNPJ_PHOTO = "71400005000150"
const CNPJ_PHOTO_OTHER = "92600018000142"
const CNPJ_SUBSCRIPTION = "84500020000111"

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
	const email = opts.email ?? `pets-test+${Date.now()}+${Math.random()}@test.com`

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

async function createClient(app: FastifyInstance, cookie: string): Promise<string> {
	const res = await app.inject({
		method: "POST",
		url: "/clients",
		headers: { cookie },
		payload: { name: "Cliente Teste", phone: "11999990000", ...baseAddress },
	})
	return res.json().id
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// POST /clients/:clientId/pets
// ---------------------------------------------------------------------------

describe("POST /clients/:clientId/pets", () => {
	let cookie: string
	let clientId: string
	let otherCookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_CREATE })
		cookie = result.cookie
		clientId = await createClient(app, cookie)

		const other = await createTenantAndLogin(app, { document: CNPJ_CREATE_OTHER })
		otherCookie = other.cookie
	})

	it("creates pet and returns 201", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
			payload: { name: "Rex", species: "Cachorro", size: "medium" },
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.name).toBe("Rex")
		expect(body.clientId).toBe(clientId)
		expect(body.size).toBe("medium")
	})

	it("returns 422 for missing required fields", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
			payload: { name: "Rex" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for invalid size value", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
			payload: { name: "Rex", species: "Cachorro", size: "giant" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 404 for client from another tenant", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/clients/${clientId}/pets`,
			headers: { cookie: otherCookie },
			payload: { name: "Rex", species: "Cachorro" },
		})

		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/clients/some-id/pets",
			payload: { name: "Rex", species: "Cachorro" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /clients/:clientId/pets
// ---------------------------------------------------------------------------

describe("GET /clients/:clientId/pets", () => {
	let cookie: string
	let otherCookie: string
	let clientId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_LIST_SELF })
		cookie = result.cookie
		clientId = await createClient(app, cookie)

		const other = await createTenantAndLogin(app, { document: CNPJ_LIST_OTHER })
		otherCookie = other.cookie

		for (const name of ["Bolinha", "Fifi"]) {
			await app.inject({
				method: "POST",
				url: `/clients/${clientId}/pets`,
				headers: { cookie },
				payload: { name, species: "Cachorro" },
			})
		}
	})

	it("returns 200 with array of pets", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBeGreaterThanOrEqual(2)
	})

	it("returns 200 with empty array for client with no pets", async () => {
		const emptyClientId = await createClient(app, cookie)

		const response = await app.inject({
			method: "GET",
			url: `/clients/${emptyClientId}/pets`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("returns 404 for client from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}/pets`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("respects tenant isolation — pets belong only to their client", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
		})

		const body = response.json()
		expect(body.every((p: { clientId: string }) => p.clientId === clientId)).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// GET /pets/:id, PATCH /pets/:id, DELETE /pets/:id
// ---------------------------------------------------------------------------

describe("GET, PATCH, DELETE /pets/:id", () => {
	let cookie: string
	let otherCookie: string
	let petId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_CRUD_SELF })
		cookie = result.cookie
		const clientId = await createClient(app, cookie)

		const other = await createTenantAndLogin(app, { document: CNPJ_CRUD_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
			payload: { name: "Bidu", species: "Gato", size: "small" },
		})
		petId = created.json().id
	})

	it("GET /pets/:id — returns 200 with pet data", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/pets/${petId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().id).toBe(petId)
	})

	it("GET /pets/:id — returns 404 for pet from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/pets/${petId}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("GET /pets/:id — returns 404 for non-existent pet", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/pets/00000000-0000-0000-0000-000000000000",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("PATCH /pets/:id — updates fields and returns 200", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/pets/${petId}`,
			headers: { cookie },
			payload: { name: "Bidu Atualizado", size: "medium" },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.name).toBe("Bidu Atualizado")
		expect(body.size).toBe("medium")
	})

	it("PATCH /pets/:id — returns 422 for invalid size", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/pets/${petId}`,
			headers: { cookie },
			payload: { size: "giant" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("PATCH /pets/:id — returns 404 for pet from another tenant", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/pets/${petId}`,
			headers: { cookie: otherCookie },
			payload: { name: "Hacked" },
		})

		expect(response.statusCode).toBe(404)
	})

	it("DELETE /pets/:id — deletes and returns 204", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/pets/${petId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(204)
	})

	it("DELETE /pets/:id — returns 404 after deletion", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/pets/${petId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// POST /pets/:id/photo
// ---------------------------------------------------------------------------

describe("POST /pets/:id/photo", () => {
	let cookie: string
	let otherCookie: string
	let petId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_PHOTO })
		cookie = result.cookie
		const clientId = await createClient(app, cookie)

		const other = await createTenantAndLogin(app, { document: CNPJ_PHOTO_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
			payload: { name: "Fofo", species: "Coelho" },
		})
		petId = created.json().id
	})

	it("returns 422 for invalid MIME type", async () => {
		const boundary = "----TestBoundary"
		const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.gif"\r\nContent-Type: image/gif\r\n\r\nGIF89a\r\n--${boundary}--`

		const response = await app.inject({
			method: "POST",
			url: `/pets/${petId}/photo`,
			headers: {
				cookie,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload: body,
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 404 for pet from another tenant", async () => {
		const boundary = "----TestBoundary2"
		const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfakeimagedata\r\n--${boundary}--`

		const response = await app.inject({
			method: "POST",
			url: `/pets/${petId}/photo`,
			headers: {
				cookie: otherCookie,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload: body,
		})

		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/pets/${petId}/photo`,
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// subscription-guard: 402 for expired tenant
// ---------------------------------------------------------------------------

describe("subscription-guard on pets", () => {
	it("returns 402 for tenant with expired subscription", async () => {
		const { cookie, tenantId } = await createTenantAndLogin(app, { document: CNPJ_SUBSCRIPTION })
		const clientId = await createClient(app, cookie)

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: `/clients/${clientId}/pets`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(402)
	})
})

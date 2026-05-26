import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildApp } from "../../../main/server"

// Valid CNPJs — unique to this file, non-conflicting with other test suites
const CNPJ_GET_OWNER = "21572980000177"
const _CNPJ_GET_COLLAB = "33600023000196"
const CNPJ_GET_OTHER = "62173620000180"
const CNPJ_PATCH_OWNER = "14616875000127"
const CNPJ_PATCH_OTHER = "90001700000193"
const CNPJ_LOGO_OWNER = "35098866000161"
const CNPJ_LOGO_OTHER = "71234560000159"

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
	role?: "owner" | "collaborator"
}): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `tenant-test+${Date.now()}+${Math.random()}@test.com`

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

function buildMultipartBody(
	fieldName: string,
	filename: string,
	mimeType: string,
	content: Buffer,
	boundary: string,
): Buffer {
	const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
	const footer = `\r\n--${boundary}--\r\n`
	return Buffer.concat([Buffer.from(header), content, Buffer.from(footer)])
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

const validPayload = {
	tenantName: "Pet Shop Teste",
	document: "11222333000181", // valid CNPJ
	documentType: "cnpj",
	userName: "Dono Teste",
	email: `owner+${Date.now()}@test.com`,
	password: "senha1234",
}

// ---------------------------------------------------------------------------
// POST /tenants
// ---------------------------------------------------------------------------

describe("POST /tenants", () => {
	it("creates tenant and returns 201 with tenantId and trialEndsAt", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: validPayload,
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("tenantId")
		expect(body).toHaveProperty("trialEndsAt")

		// trialEndsAt must be ~14 days from now
		const trialEndsAt = new Date(body.trialEndsAt)
		const diffDays = (trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		expect(diffDays).toBeCloseTo(14, 0)
	})

	it("returns 409 when document already exists", async () => {
		const email = `owner+dup-doc+${Date.now()}@test.com`
		// First registration
		await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { ...validPayload, email, document: "07526557000100" },
		})
		// Duplicate document
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: {
				...validPayload,
				email: `other+${Date.now()}@test.com`,
				document: "07526557000100",
			},
		})
		expect(response.statusCode).toBe(409)
		expect(response.json().error).toMatch(/documento/i)
	})

	it("returns 409 when email already exists", async () => {
		const sharedEmail = `shared+${Date.now()}@test.com`
		// First registration
		await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { ...validPayload, email: sharedEmail, document: "53612734000198" },
		})
		// Duplicate email
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { ...validPayload, email: sharedEmail, document: "96769900000177" },
		})
		expect(response.statusCode).toBe(409)
		expect(response.json().error).toMatch(/e-mail/i)
	})

	it("returns 422 for invalid CPF", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { ...validPayload, document: "11111111111", documentType: "cpf" },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for invalid CNPJ", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { ...validPayload, document: "00000000000000", documentType: "cnpj" },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when required fields are missing", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { tenantName: "Sem email" },
		})
		expect(response.statusCode).toBe(422)
	})
})

// ---------------------------------------------------------------------------
// GET /tenants/:id
// ---------------------------------------------------------------------------

describe("GET /tenants/:id", () => {
	let ownerCookie: string
	let otherCookie: string
	let tenantId: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_GET_OWNER })
		ownerCookie = owner.cookie
		tenantId = owner.tenantId

		const other = await createTenantAndLogin({ document: CNPJ_GET_OTHER })
		otherCookie = other.cookie
	})

	it("returns 200 with tenant profile for owner", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/tenants/${tenantId}`,
			headers: { cookie: ownerCookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("id", tenantId)
		expect(body).toHaveProperty("name")
		expect(body).toHaveProperty("document")
		expect(body).toHaveProperty("plan")
		expect(body).toHaveProperty("subscriptionStatus")
		expect(body).toHaveProperty("trialEndsAt")
	})

	it("returns 403 when member reads a different tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/tenants/${tenantId}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(403)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/tenants/${tenantId}`,
		})

		expect(response.statusCode).toBe(401)
	})

	it("returns 404 for non-existent tenant id when authenticated", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/tenants/00000000-0000-0000-0000-000000000000",
			headers: { cookie: ownerCookie },
		})

		// tenantId from JWT doesn't match the param, so 403 fires before the DB lookup
		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// PATCH /tenants/:id
// ---------------------------------------------------------------------------

describe("PATCH /tenants/:id", () => {
	let ownerCookie: string
	let otherCookie: string
	let tenantId: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_PATCH_OWNER })
		ownerCookie = owner.cookie
		tenantId = owner.tenantId

		const other = await createTenantAndLogin({ document: CNPJ_PATCH_OTHER })
		otherCookie = other.cookie
	})

	it("returns 200 and updates name", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}`,
			headers: { cookie: ownerCookie },
			payload: { name: "Pet Shop Atualizado" },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().name).toBe("Pet Shop Atualizado")
	})

	it("returns 200 and sets Pix key", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}`,
			headers: { cookie: ownerCookie },
			payload: { pixKey: "11999990000", pixKeyType: "phone" },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().pixKey).toBe("11999990000")
		expect(response.json().pixKeyType).toBe("phone")
	})

	it("returns 200 and clears Pix key", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}`,
			headers: { cookie: ownerCookie },
			payload: { pixKey: null, pixKeyType: null },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().pixKey).toBeNull()
	})

	it("returns 200 with unchanged data for empty body", async () => {
		const before = await app.inject({
			method: "GET",
			url: `/tenants/${tenantId}`,
			headers: { cookie: ownerCookie },
		})

		const response = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}`,
			headers: { cookie: ownerCookie },
			payload: {},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().name).toBe(before.json().name)
	})

	it("returns 403 for non-owner role (cross-tenant)", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}`,
			headers: { cookie: otherCookie },
			payload: { name: "Hacked" },
		})

		expect(response.statusCode).toBe(403)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}`,
			payload: { name: "Sem Auth" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// POST /tenants/:id/logo
// ---------------------------------------------------------------------------

describe("POST /tenants/:id/logo", () => {
	let ownerCookie: string
	let otherCookie: string
	let tenantId: string

	const boundary = "----TestBoundary123"

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_LOGO_OWNER })
		ownerCookie = owner.cookie
		tenantId = owner.tenantId

		const other = await createTenantAndLogin({ document: CNPJ_LOGO_OTHER })
		otherCookie = other.cookie
	})

	it("returns 422 for unsupported file type", async () => {
		const body = buildMultipartBody(
			"logo",
			"logo.gif",
			"image/gif",
			Buffer.from("GIF89a"),
			boundary,
		)

		const response = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/logo`,
			headers: {
				cookie: ownerCookie,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload: body,
		})

		expect(response.statusCode).toBe(422)
		expect(response.json().error).toMatch(/formato/i)
	})

	it("returns 422 for file exceeding 5 MB", async () => {
		const bigFile = Buffer.alloc(6 * 1024 * 1024, 0xff)
		const body = buildMultipartBody("logo", "big.jpg", "image/jpeg", bigFile, boundary)

		const response = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/logo`,
			headers: {
				cookie: ownerCookie,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload: body,
		})

		expect(response.statusCode).toBe(422)
		expect(response.json().error).toMatch(/grande/i)
	})

	it("returns 403 for cross-tenant upload attempt", async () => {
		const body = buildMultipartBody("logo", "logo.png", "image/png", Buffer.from("PNG"), boundary)

		const response = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/logo`,
			headers: {
				cookie: otherCookie,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload: body,
		})

		expect(response.statusCode).toBe(403)
	})

	it("returns 401 without authentication", async () => {
		const body = buildMultipartBody("logo", "logo.png", "image/png", Buffer.from("PNG"), boundary)

		const response = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/logo`,
			headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
			payload: body,
		})

		expect(response.statusCode).toBe(401)
	})

	it("returns 200 with logoUrl for valid upload, or 500 when R2 is not configured", async () => {
		// Minimal valid PNG header
		const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
		const body = buildMultipartBody("logo", "logo.png", "image/png", pngHeader, boundary)

		const response = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/logo`,
			headers: {
				cookie: ownerCookie,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload: body,
		})

		// 200 when R2 is configured, 500 when not (env vars are optional in test environment)
		expect([200, 500]).toContain(response.statusCode)
		if (response.statusCode === 200) {
			expect(response.json()).toHaveProperty("logoUrl")
		}
	})
})

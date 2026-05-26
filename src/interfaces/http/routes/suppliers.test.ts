import { and, eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { db } from "../../../infra/database/drizzle/client"
import { tenantInvitations, tenantMembers, tenants } from "../../../infra/database/drizzle/schema"
import { buildApp } from "../../../main/server"

// Valid CNPJs unique to this test file
const CNPJ_LIST = "93001101100111"
const CNPJ_CREATE = "93102202200213"
const CNPJ_GET = "93203303300315"
const CNPJ_GET_OTHER = "93304404400417"
const CNPJ_UPDATE = "93405505500519"
const CNPJ_DEACTIVATE = "93607707700712"
const CNPJ_ROLE = "93809909900916"
const CNPJ_PREMIUM = "93910010001036"

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
}): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `sup-test+${Date.now()}+${Math.random()}@test.com`

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
// GET /suppliers
// ---------------------------------------------------------------------------

describe("GET /suppliers", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_LIST })
		cookie = result.cookie

		for (const name of ["Fornecedor Alpha", "Fornecedor Beta", "Fornecedor Gama"]) {
			await app.inject({
				method: "POST",
				url: "/suppliers",
				headers: { cookie },
				payload: { name },
			})
		}
	})

	it("returns 200 with paginated active suppliers", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/suppliers",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("data")
		expect(body).toHaveProperty("total")
		expect(body).toHaveProperty("page")
		expect(body).toHaveProperty("limit")
		expect(Array.isArray(body.data)).toBe(true)
		expect(body.data.length).toBeGreaterThanOrEqual(3)
	})

	it("returns only active suppliers by default", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/suppliers",
			headers: { cookie },
		})

		const body = response.json()
		expect(body.data.every((s: { active: boolean }) => s.active === true)).toBe(true)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: "/suppliers" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// POST /suppliers
// ---------------------------------------------------------------------------

describe("POST /suppliers", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_CREATE })
		cookie = result.cookie
	})

	it("creates supplier and returns 201", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Fornecedor XYZ", phone: "11999990000" },
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.name).toBe("Fornecedor XYZ")
		expect(body.active).toBe(true)
	})

	it("creates supplier with valid CNPJ document", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Fornecedor CNPJ", document: "68001001000194" },
		})

		expect(response.statusCode).toBe(201)
	})

	it("rejects invalid document and returns 422", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Fornecedor Inválido", document: "00000000000000" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for missing name", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: {},
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/suppliers",
			payload: { name: "Sem Auth" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /suppliers/:id
// ---------------------------------------------------------------------------

describe("GET /suppliers/:id", () => {
	let cookie: string
	let otherCookie: string
	let supplierId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_GET })
		cookie = result.cookie

		const other = await createTenantAndLogin({ document: CNPJ_GET_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Fornecedor Para Get" },
		})
		supplierId = created.json().id
	})

	it("returns 200 with supplier data", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/suppliers/${supplierId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.id).toBe(supplierId)
		expect(body.name).toBe("Fornecedor Para Get")
	})

	it("returns 404 for non-existent supplier", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/suppliers/non-existent-id",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("returns 404 when supplier belongs to another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/suppliers/${supplierId}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// PATCH /suppliers/:id
// ---------------------------------------------------------------------------

describe("PATCH /suppliers/:id", () => {
	let cookie: string
	let supplierId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_UPDATE })
		cookie = result.cookie

		const created = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Fornecedor Original" },
		})
		supplierId = created.json().id
	})

	it("updates supplier and returns 200", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/suppliers/${supplierId}`,
			headers: { cookie },
			payload: { name: "Fornecedor Atualizado" },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.name).toBe("Fornecedor Atualizado")
	})

	it("rejects invalid document on update and returns 422", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/suppliers/${supplierId}`,
			headers: { cookie },
			payload: { document: "99999999999999" },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 404 for non-existent supplier", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/suppliers/non-existent-id",
			headers: { cookie },
			payload: { name: "Não existe" },
		})

		expect(response.statusCode).toBe(404)
	})
})

// ---------------------------------------------------------------------------
// DELETE /suppliers/:id
// ---------------------------------------------------------------------------

describe("DELETE /suppliers/:id", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_DEACTIVATE })
		cookie = result.cookie
	})

	it("deactivates supplier and returns 204", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Para Desativar" },
		})
		const id = created.json().id

		const response = await app.inject({
			method: "DELETE",
			url: `/suppliers/${id}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(204)
	})

	it("returns 409 when supplier is already inactive", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Para Duplo Delete" },
		})
		const id = created.json().id

		await app.inject({ method: "DELETE", url: `/suppliers/${id}`, headers: { cookie } })

		const response = await app.inject({
			method: "DELETE",
			url: `/suppliers/${id}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(409)
	})

	it("returns 404 for non-existent supplier", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/suppliers/non-existent-id",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("deactivated supplier no longer appears in default list", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie },
			payload: { name: "Invisível após desativação" },
		})
		const id = created.json().id

		await app.inject({ method: "DELETE", url: `/suppliers/${id}`, headers: { cookie } })

		const listResponse = await app.inject({
			method: "GET",
			url: "/suppliers",
			headers: { cookie },
		})

		const ids = listResponse.json().data.map((s: { id: string }) => s.id)
		expect(ids).not.toContain(id)
	})
})

// ---------------------------------------------------------------------------
// Role authorization: financial cannot write
// ---------------------------------------------------------------------------

describe("role authorization on /suppliers", () => {
	let ownerCookie: string
	let financialCookie: string
	let tenantId: string
	let supplierId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_ROLE })
		ownerCookie = result.cookie
		tenantId = result.tenantId

		const created = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie: ownerCookie },
			payload: { name: "Fornecedor Role Test" },
		})
		supplierId = created.json().id

		const financialEmail = `financial-sup+${Date.now()}@test.com`

		await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: financialEmail, role: "collaborator" },
		})

		const invRecord = await db
			.select()
			.from(tenantInvitations)
			.where(
				and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.email, financialEmail)),
			)
			.limit(1)
			.then((rows) => rows[0])

		if (!invRecord) return

		const acceptRes = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/accept-invite?token=${invRecord.token}`,
			payload: { name: "Financial User", password: PASSWORD },
		})

		if (acceptRes.statusCode !== 201) return

		const signIn = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email: financialEmail, password: PASSWORD },
		})
		const cookies = signIn.headers["set-cookie"] as string | string[]
		financialCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies

		const [member] = await db
			.select({ id: tenantMembers.id })
			.from(tenantMembers)
			.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "collaborator")))
			.limit(1)

		if (member) {
			await db
				.update(tenantMembers)
				.set({ role: "financial" })
				.where(eq(tenantMembers.id, member.id))
		}
	})

	it("financial can GET /suppliers — returns 200", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/suppliers",
			headers: { cookie: financialCookie },
		})
		expect(response.statusCode).toBe(200)
	})

	it("financial cannot POST /suppliers — returns 403", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/suppliers",
			headers: { cookie: financialCookie },
			payload: { name: "Tentativa Financial" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("financial cannot PATCH /suppliers/:id — returns 403", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/suppliers/${supplierId}`,
			headers: { cookie: financialCookie },
			payload: { name: "Tentativa Financial" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("financial cannot DELETE /suppliers/:id — returns 403", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/suppliers/${supplierId}`,
			headers: { cookie: financialCookie },
		})
		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// Premium plan guard
// ---------------------------------------------------------------------------

describe("premium guard on /suppliers", () => {
	it("returns 403 for tenant with active essential plan", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_PREMIUM })

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
})

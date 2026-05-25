import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants, tenantMembers } from "../../../infra/database/drizzle/schema"
import { and, eq } from "drizzle-orm"

// Valid CNPJs — unique to this file, non-conflicting with other test files
// Computed via CNPJ check-digit algorithm in src/domain/shared/document.validator.ts
const CNPJ_POST = "68001001000194"
const CNPJ_GET = "69002002000205"
const CNPJ_GET_OTHER = "70003003000326"
const CNPJ_PATCH = "71004004000439"
const CNPJ_PATCH_OTHER = "72005005000541"
const CNPJ_DELETE = "73006006000654"
const CNPJ_DELETE_OTHER = "74007007000767"
const CNPJ_ROLE = "78008008000868"
const CNPJ_SUBSCRIPTION = "79009009000970"

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
}): Promise<{ cookie: string; tenantId: string }> {
	const email = opts.email ?? `cat-test+${Date.now()}+${Math.random()}@test.com`

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
// POST /products/categories
// ---------------------------------------------------------------------------

describe("POST /products/categories", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_POST })
		cookie = result.cookie
	})

	it("creates category and returns 201 with id and name", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Rações" },
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.name).toBe("Rações")
	})

	it("returns 409 for duplicate name in same tenant", async () => {
		await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Duplicada" },
		})

		const response = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Duplicada" },
		})

		expect(response.statusCode).toBe(409)
	})

	it("returns 422 for missing name", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: {},
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/products/categories",
			payload: { name: "Sem Auth" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /products/categories
// ---------------------------------------------------------------------------

describe("GET /products/categories", () => {
	let cookie: string
	let otherCookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_GET })
		cookie = result.cookie

		const other = await createTenantAndLogin({ document: CNPJ_GET_OTHER })
		otherCookie = other.cookie

		for (const name of ["Shampoos", "Medicamentos", "Acessórios"]) {
			await app.inject({
				method: "POST",
				url: "/products/categories",
				headers: { cookie },
				payload: { name },
			})
		}

		await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie: otherCookie },
			payload: { name: "Categoria de outro tenant" },
		})
	})

	it("returns 200 with array ordered by name ascending", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/products/categories",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBeGreaterThanOrEqual(3)
		const names = body.map((c: { name: string }) => c.name)
		expect([...names].sort()).toEqual(names)
	})

	it("does not return categories from another tenant", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/products/categories",
			headers: { cookie },
		})

		const body = response.json()
		const hasOther = body.some((c: { name: string }) => c.name === "Categoria de outro tenant")
		expect(hasOther).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// PATCH /products/categories/:id
// ---------------------------------------------------------------------------

describe("PATCH /products/categories/:id", () => {
	let cookie: string
	let otherCookie: string
	let categoryId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_PATCH })
		cookie = result.cookie

		const other = await createTenantAndLogin({ document: CNPJ_PATCH_OTHER })
		otherCookie = other.cookie

		const created = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Original" },
		})
		categoryId = created.json().id
	})

	it("renames category and returns 200 with updated name", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/products/categories/${categoryId}`,
			headers: { cookie },
			payload: { name: "Renomeada" },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json().name).toBe("Renomeada")
	})

	it("returns 409 for duplicate name in same tenant", async () => {
		await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Existente" },
		})

		const response = await app.inject({
			method: "PATCH",
			url: `/products/categories/${categoryId}`,
			headers: { cookie },
			payload: { name: "Existente" },
		})

		expect(response.statusCode).toBe(409)
	})

	it("returns 404 for category belonging to another tenant", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/products/categories/${categoryId}`,
			headers: { cookie: otherCookie },
			payload: { name: "Hackeado" },
		})

		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/products/categories/${categoryId}`,
			payload: { name: "Sem Auth" },
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// DELETE /products/categories/:id
// ---------------------------------------------------------------------------

describe("DELETE /products/categories/:id", () => {
	let cookie: string
	let otherCookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_DELETE })
		cookie = result.cookie

		const other = await createTenantAndLogin({ document: CNPJ_DELETE_OTHER })
		otherCookie = other.cookie
	})

	it("deletes category and returns 204", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Para Deletar" },
		})
		const id = created.json().id

		const response = await app.inject({
			method: "DELETE",
			url: `/products/categories/${id}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(204)
	})

	it("returns 422 when category has active products", async () => {
		const catRes = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Com Produto" },
		})
		const categoryId = catRes.json().id

		await app.inject({
			method: "POST",
			url: "/products",
			headers: { cookie },
			payload: {
				name: "Produto Vinculado",
				unitType: "unit",
				costPrice: "10.00",
				marginPercent: "20.00",
				categoryId,
			},
		})

		const response = await app.inject({
			method: "DELETE",
			url: `/products/categories/${categoryId}`,
			headers: { cookie },
		})

		expect(response.statusCode).toBe(422)
	})

	it("returns 404 for category belonging to another tenant", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie },
			payload: { name: "Isolamento" },
		})
		const id = created.json().id

		const response = await app.inject({
			method: "DELETE",
			url: `/products/categories/${id}`,
			headers: { cookie: otherCookie },
		})

		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/products/categories/00000000-0000-0000-0000-000000000000",
		})

		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// Role authorization: collaborator and financial restrictions
// ---------------------------------------------------------------------------

describe("role authorization on /products/categories", () => {
	let roleCookie: string
	let tenantId: string
	let categoryId: string
	let memberId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin({ document: CNPJ_ROLE })
		roleCookie = result.cookie
		tenantId = result.tenantId

		const created = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie: roleCookie },
			payload: { name: "Categoria Role" },
		})
		categoryId = created.json().id

		const collabEmail = `collab-cat+${Date.now()}@test.com`
		const inviteRes = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: roleCookie },
			payload: { email: collabEmail, role: "collaborator" },
		})

		if (inviteRes.statusCode === 201) {
			const signIn = await app.inject({
				method: "POST",
				url: "/auth/sign-in/email",
				payload: { email: collabEmail, password: PASSWORD },
			})
			const cookies = signIn.headers["set-cookie"] as string | string[]
			roleCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies

			const [member] = await db
				.select({ id: tenantMembers.id })
				.from(tenantMembers)
				.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "collaborator")))
				.limit(1)
			memberId = member.id
		} else {
			const [member] = await db
				.select({ id: tenantMembers.id })
				.from(tenantMembers)
				.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "owner")))
				.limit(1)

			if (member) {
				memberId = member.id
				await db.update(tenantMembers).set({ role: "collaborator" }).where(eq(tenantMembers.id, member.id))
			}
		}
	})

	it("collaborator cannot POST /products/categories — returns 403", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/products/categories",
			headers: { cookie: roleCookie },
			payload: { name: "Tentativa Collab" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot PATCH /products/categories/:id — returns 403", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/products/categories/${categoryId}`,
			headers: { cookie: roleCookie },
			payload: { name: "Tentativa Collab" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot DELETE /products/categories/:id — returns 403", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/products/categories/${categoryId}`,
			headers: { cookie: roleCookie },
		})
		expect(response.statusCode).toBe(403)
	})

	it("financial cannot DELETE /products/categories/:id — returns 403", async () => {
		await db.update(tenantMembers).set({ role: "financial" }).where(eq(tenantMembers.id, memberId))

		const response = await app.inject({
			method: "DELETE",
			url: `/products/categories/${categoryId}`,
			headers: { cookie: roleCookie },
		})
		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// Subscription guard: 402 for expired tenant
// ---------------------------------------------------------------------------

describe("subscription guard on /products/categories", () => {
	it("returns 402 for tenant with expired subscription", async () => {
		const { cookie, tenantId } = await createTenantAndLogin({ document: CNPJ_SUBSCRIPTION })

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/products/categories",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(402)
	})
})

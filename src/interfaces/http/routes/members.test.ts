import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { db } from "../../../infra/database/drizzle/client"
import { tenantInvitations, tenantMembers } from "../../../infra/database/drizzle/schema"
import { buildApp } from "../../../main/server"

// Valid CNPJs — unique to this file, non-conflicting with other test files
// Computed via CNPJ check-digit algorithm in src/domain/shared/document.validator.ts
const CNPJ_LIST = "11010000000199"
const CNPJ_INVITE = "22020000000277"
const CNPJ_INVITE_TARGET = "33030000000355"
const CNPJ_INVITE_NEW = "44040000000433"
const CNPJ_ACCEPT = "55050000000511"
const CNPJ_ROLE_UPDATE = "66060000000608"
const CNPJ_ROLE_COLLAB = "99090000000944"
const CNPJ_ROLE_LAST_OWNER = "11210000000132"
const CNPJ_ROLE_NONOWNER = "22320000000292"
const CNPJ_REMOVE = "77070000000788"
const CNPJ_REMOVE_COLLAB = "33430000000342"
const CNPJ_REMOVE_NONOWNER = "44540000000400"
const _CNPJ_WRONG_TENANT = "88080000000866"
const CNPJ_WRONG_TENANT_OTHER = "55650000000552"

const PASSWORD = "senha1234"

let app: FastifyInstance

async function createTenantAndLogin(opts: {
	document: string
	email?: string
}): Promise<{ cookie: string; tenantId: string; userId: string }> {
	const email = opts.email ?? `members-test+${Date.now()}+${Math.random()}@test.com`

	const reg = await app.inject({
		method: "POST",
		url: "/tenants",
		payload: {
			tenantName: "Pet Shop Teste",
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

	const member = await db
		.select({ userId: tenantMembers.userId })
		.from(tenantMembers)
		.where(eq(tenantMembers.tenantId, tenantId))
		.limit(1)
		.then((rows) => rows[0])

	return { cookie, tenantId, userId: member.userId }
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// GET /tenants/:tenantId/members
// ---------------------------------------------------------------------------

describe("GET /tenants/:tenantId/members", () => {
	let cookie: string
	let tenantId: string
	let _otherCookie: string
	let otherTenantId: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_LIST })
		cookie = owner.cookie
		tenantId = owner.tenantId

		const other = await createTenantAndLogin({ document: CNPJ_WRONG_TENANT_OTHER })
		_otherCookie = other.cookie
		otherTenantId = other.tenantId
	})

	it("returns 200 with member list for own tenant", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/tenants/${tenantId}/members`,
			headers: { cookie },
		})

		expect(res.statusCode).toBe(200)
		const body = res.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body).toHaveLength(1)
		expect(body[0]).toMatchObject({ role: "owner" })
		expect(body[0]).toHaveProperty("userId")
		expect(body[0]).toHaveProperty("name")
		expect(body[0]).toHaveProperty("email")
		expect(body[0]).toHaveProperty("joinedAt")
	})

	it("returns 401 without authentication", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/tenants/${tenantId}/members`,
		})
		expect(res.statusCode).toBe(401)
	})

	it("returns 403 when accessing another tenant", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/tenants/${otherTenantId}/members`,
			headers: { cookie },
		})
		expect(res.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// POST /tenants/:tenantId/members/invite
// ---------------------------------------------------------------------------

describe("POST /tenants/:tenantId/members/invite", () => {
	let ownerCookie: string
	let tenantId: string
	let targetEmail: string
	let otherCookie: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_INVITE })
		ownerCookie = owner.cookie
		tenantId = owner.tenantId

		// Create a user in another tenant to use as invite target
		targetEmail = `invite-target+${Date.now()}@test.com`
		const target = await createTenantAndLogin({ document: CNPJ_INVITE_TARGET, email: targetEmail })
		otherCookie = target.cookie
	})

	it("adds existing user and returns 201", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: targetEmail, role: "collaborator" },
		})

		expect(res.statusCode).toBe(201)
		const body = res.json()
		expect(body.status).toBe("added")
		expect(body).toHaveProperty("userId")
	})

	it("returns 409 when user is already a member", async () => {
		// targetEmail was added above; invite again should 409
		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: targetEmail, role: "collaborator" },
		})
		expect(res.statusCode).toBe(409)
	})

	it("returns 403 when non-owner invites", async () => {
		// otherCookie belongs to CNPJ_INVITE_TARGET tenant → different tenantId
		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: otherCookie },
			payload: { email: "anyone@test.com", role: "collaborator" },
		})
		expect(res.statusCode).toBe(403)
	})

	it("returns 422 for invalid role", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: "valid@test.com", role: "admin" },
		})
		expect(res.statusCode).toBe(422)
	})
})

// ---------------------------------------------------------------------------
// POST /tenants/:tenantId/members/invite — new user (202)
// ---------------------------------------------------------------------------

describe("POST /tenants/:tenantId/members/invite — new user", () => {
	let ownerCookie: string
	let tenantId: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_INVITE_NEW })
		ownerCookie = owner.cookie
		tenantId = owner.tenantId
	})

	it("creates pending invitation and returns 202", async () => {
		const newEmail = `brand-new-user+${Date.now()}@test.com`

		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: newEmail, role: "financial" },
		})

		expect(res.statusCode).toBe(202)
		expect(res.json().status).toBe("invited")

		const invitation = await db
			.select()
			.from(tenantInvitations)
			.where(eq(tenantInvitations.tenantId, tenantId))
			.limit(1)
			.then((rows) => rows[0])

		expect(invitation).toBeDefined()
		expect(invitation.email).toBe(newEmail)
		expect(invitation.role).toBe("financial")
		expect(invitation.token).toBeTruthy()
	})
})

// ---------------------------------------------------------------------------
// POST /tenants/:tenantId/members/accept-invite
// ---------------------------------------------------------------------------

describe("POST /tenants/:tenantId/members/accept-invite", () => {
	let ownerCookie: string
	let tenantId: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_ACCEPT })
		ownerCookie = owner.cookie
		tenantId = owner.tenantId
	})

	it("accepts valid invitation and creates user+member (201)", async () => {
		const newEmail = `accept-valid+${Date.now()}@test.com`

		await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: newEmail, role: "collaborator" },
		})

		const invitation = await db
			.select()
			.from(tenantInvitations)
			.where(eq(tenantInvitations.tenantId, tenantId))
			.limit(1)
			.then((rows) => rows[0])

		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/accept-invite?token=${invitation.token}`,
			payload: { name: "Novo Colaborador", password: "senha5678" },
		})

		expect(res.statusCode).toBe(201)
		expect(res.json()).toHaveProperty("userId")

		const remaining = await db
			.select()
			.from(tenantInvitations)
			.where(eq(tenantInvitations.id, invitation.id))
			.limit(1)
		expect(remaining).toHaveLength(0)
	})

	it("returns 410 for expired token", async () => {
		const expiredToken = crypto.randomUUID()
		await db.insert(tenantInvitations).values({
			id: crypto.randomUUID(),
			tenantId,
			email: `expired+${Date.now()}@test.com`,
			role: "collaborator",
			token: expiredToken,
			expiresAt: new Date(Date.now() - 1000),
		})

		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/accept-invite?token=${expiredToken}`,
			payload: { name: "Expirado", password: "senha5678" },
		})
		expect(res.statusCode).toBe(410)
	})

	it("returns 404 for unknown token", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/accept-invite?token=${crypto.randomUUID()}`,
			payload: { name: "Qualquer", password: "senha5678" },
		})
		expect(res.statusCode).toBe(404)
	})

	it("returns 422 when token is missing", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/accept-invite`,
			payload: { name: "Qualquer", password: "senha5678" },
		})
		expect(res.statusCode).toBe(422)
	})
})

// ---------------------------------------------------------------------------
// PATCH /tenants/:tenantId/members/:userId
// ---------------------------------------------------------------------------

describe("PATCH /tenants/:tenantId/members/:userId", () => {
	let tenantId: string
	let ownerCookie: string
	let _ownerUserId: string
	let collabUserId: string
	let nonOwnerCookie: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_ROLE_UPDATE })
		tenantId = owner.tenantId
		ownerCookie = owner.cookie
		_ownerUserId = owner.userId

		// Create a collaborator via another tenant then invite
		const collabEmail = `role-collab+${Date.now()}@test.com`
		await createTenantAndLogin({ document: CNPJ_ROLE_COLLAB, email: collabEmail })

		const inviteRes = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: collabEmail, role: "collaborator" },
		})
		collabUserId = inviteRes.json().userId

		const nonOwner = await createTenantAndLogin({ document: CNPJ_ROLE_NONOWNER })
		nonOwnerCookie = nonOwner.cookie
	})

	it("updates member role and returns 200", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}/members/${collabUserId}`,
			headers: { cookie: ownerCookie },
			payload: { role: "financial" },
		})
		expect(res.statusCode).toBe(200)
		expect(res.json()).toMatchObject({ userId: collabUserId, role: "financial" })
	})

	it("returns 409 when downgrading last owner", async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_ROLE_LAST_OWNER })

		const res = await app.inject({
			method: "PATCH",
			url: `/tenants/${owner.tenantId}/members/${owner.userId}`,
			headers: { cookie: owner.cookie },
			payload: { role: "collaborator" },
		})
		expect(res.statusCode).toBe(409)
	})

	it("returns 403 when non-owner tries to update role", async () => {
		// nonOwnerCookie belongs to a different tenant
		const res = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}/members/${collabUserId}`,
			headers: { cookie: nonOwnerCookie },
			payload: { role: "collaborator" },
		})
		expect(res.statusCode).toBe(403)
	})

	it("returns 422 for invalid role", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: `/tenants/${tenantId}/members/${collabUserId}`,
			headers: { cookie: ownerCookie },
			payload: { role: "superadmin" },
		})
		expect(res.statusCode).toBe(422)
	})
})

// ---------------------------------------------------------------------------
// DELETE /tenants/:tenantId/members/:userId
// ---------------------------------------------------------------------------

describe("DELETE /tenants/:tenantId/members/:userId", () => {
	let tenantId: string
	let ownerCookie: string
	let ownerUserId: string
	let collabUserId: string
	let nonOwnerCookie: string

	beforeAll(async () => {
		const owner = await createTenantAndLogin({ document: CNPJ_REMOVE })
		tenantId = owner.tenantId
		ownerCookie = owner.cookie
		ownerUserId = owner.userId

		const collabEmail = `remove-collab+${Date.now()}@test.com`
		await createTenantAndLogin({ document: CNPJ_REMOVE_COLLAB, email: collabEmail })

		const inviteRes = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: collabEmail, role: "collaborator" },
		})
		collabUserId = inviteRes.json().userId

		const nonOwner = await createTenantAndLogin({ document: CNPJ_REMOVE_NONOWNER })
		nonOwnerCookie = nonOwner.cookie
	})

	it("removes a member and returns 204", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/tenants/${tenantId}/members/${collabUserId}`,
			headers: { cookie: ownerCookie },
		})
		expect(res.statusCode).toBe(204)
	})

	it("returns 409 when removing the last owner", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/tenants/${tenantId}/members/${ownerUserId}`,
			headers: { cookie: ownerCookie },
		})
		expect(res.statusCode).toBe(409)
	})

	it("returns 404 when member does not exist", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/tenants/${tenantId}/members/${crypto.randomUUID()}`,
			headers: { cookie: ownerCookie },
		})
		expect(res.statusCode).toBe(404)
	})

	it("returns 403 when non-owner attempts removal", async () => {
		// nonOwnerCookie belongs to a different tenant
		const res = await app.inject({
			method: "DELETE",
			url: `/tenants/${tenantId}/members/${ownerUserId}`,
			headers: { cookie: nonOwnerCookie },
		})
		expect(res.statusCode).toBe(403)
	})

	it("returns 401 without authentication", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/tenants/${tenantId}/members/${ownerUserId}`,
		})
		expect(res.statusCode).toBe(401)
	})
})

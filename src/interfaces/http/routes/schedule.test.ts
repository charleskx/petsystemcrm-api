import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants, tenantMembers } from "../../../infra/database/drizzle/schema"
import { and, eq } from "drizzle-orm"

let app: FastifyInstance

// Valid CNPJs — unique to this file, non-conflicting with other test files
const CNPJ_GET_SCHEDULE = "12003004000536"
const CNPJ_PUT_SCHEDULE = "31004005000620"
const CNPJ_HOLIDAYS = "42005006000797"
const CNPJ_SLOTS = "53006007000853"
const CNPJ_COLLAB = "64007008000910"
const CNPJ_SUBSCRIPTION = "75008009000148"

const PASSWORD = "senha1234"

async function createTenantAndLogin(
	app: FastifyInstance,
	opts: { document: string; email?: string },
): Promise<{ cookie: string; tenantId: string; userId: string }> {
	const email = opts.email ?? `schedule-test+${Date.now()}+${Math.random()}@test.com`

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
	const userId = signIn.json().user?.id ?? ""

	return { cookie, tenantId, userId }
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// GET /schedule
// ---------------------------------------------------------------------------

describe("GET /schedule", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_GET_SCHEDULE })
		cookie = result.cookie
	})

	it("returns 200 with empty array when no schedule configured", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: "/schedule" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// PUT /schedule
// ---------------------------------------------------------------------------

describe("PUT /schedule", () => {
	let cookie: string
	let tenantId: string

	const validSchedule = [
		{ dayOfWeek: "1", openTime: "08:00", closeTime: "18:00", isClosed: false },
		{ dayOfWeek: "2", openTime: "08:00", closeTime: "18:00", isClosed: false },
		{ dayOfWeek: "0", openTime: null, closeTime: null, isClosed: true },
	]

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_PUT_SCHEDULE })
		cookie = result.cookie
		tenantId = result.tenantId
	})

	it("saves schedule and returns 200 with updated entries", async () => {
		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie },
			payload: validSchedule,
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveLength(3)
		expect(body.find((e: { dayOfWeek: string }) => e.dayOfWeek === "1")).toMatchObject({
			dayOfWeek: "1",
			openTime: "08:00:00",
			closeTime: "18:00:00",
			isClosed: false,
		})
		expect(body.find((e: { dayOfWeek: string }) => e.dayOfWeek === "0")).toMatchObject({
			dayOfWeek: "0",
			isClosed: true,
		})
	})

	it("replaces all previous entries on second PUT", async () => {
		const newSchedule = [{ dayOfWeek: "3", openTime: "09:00", closeTime: "17:00", isClosed: false }]

		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie },
			payload: newSchedule,
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveLength(1)
		expect(body[0].dayOfWeek).toBe("3")
	})

	it("returns 422 when open_time >= close_time", async () => {
		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie },
			payload: [{ dayOfWeek: "1", openTime: "18:00", closeTime: "08:00", isClosed: false }],
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when day_of_week is duplicated", async () => {
		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie },
			payload: [
				{ dayOfWeek: "1", openTime: "08:00", closeTime: "18:00", isClosed: false },
				{ dayOfWeek: "1", openTime: "09:00", closeTime: "17:00", isClosed: false },
			],
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when day_of_week is out of range", async () => {
		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie },
			payload: [{ dayOfWeek: "7", openTime: "08:00", closeTime: "18:00", isClosed: false }],
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			payload: validSchedule,
		})
		expect(response.statusCode).toBe(401)
	})

	it("enforces tenant isolation — other tenant does not see entries", async () => {
		const { cookie: otherCookie } = await createTenantAndLogin(app, {
			document: "86009001000201",
			email: `isolation-sched+${Date.now()}@test.com`,
		})

		const response = await app.inject({
			method: "GET",
			url: "/schedule",
			headers: { cookie: otherCookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})
})

// ---------------------------------------------------------------------------
// GET /schedule/holidays + POST /schedule/holidays + DELETE /schedule/holidays/:id
// ---------------------------------------------------------------------------

describe("holidays", () => {
	let cookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_HOLIDAYS })
		cookie = result.cookie
		tenantId = result.tenantId
	})

	it("GET /schedule/holidays returns empty array initially", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule/holidays",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("POST /schedule/holidays creates a holiday and returns 201", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "2025-12-25", description: "Natal" },
		})
		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.date).toBe("2025-12-25")
		expect(body.description).toBe("Natal")
	})

	it("GET /schedule/holidays returns holidays ordered by date", async () => {
		await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "2025-01-01", description: "Ano Novo" },
		})

		const response = await app.inject({
			method: "GET",
			url: "/schedule/holidays",
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.length).toBeGreaterThanOrEqual(2)
		expect(body[0].date).toBe("2025-01-01")
		expect(body[1].date).toBe("2025-12-25")
	})

	it("POST /schedule/holidays returns 409 for duplicate date", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "2025-12-25", description: "Natal duplicado" },
		})
		expect(response.statusCode).toBe(409)
	})

	it("POST /schedule/holidays returns 422 for invalid date format", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "25/12/2025", description: "Data inválida" },
		})
		expect(response.statusCode).toBe(422)
	})

	it("POST /schedule/holidays returns 422 when fields are missing", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "2025-06-15" },
		})
		expect(response.statusCode).toBe(422)
	})

	it("DELETE /schedule/holidays/:id removes holiday and returns 204", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "2025-07-09", description: "Independência" },
		})
		const { id } = created.json()

		const response = await app.inject({
			method: "DELETE",
			url: `/schedule/holidays/${id}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(204)
	})

	it("DELETE /schedule/holidays/:id returns 404 for non-existent id", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/schedule/holidays/non-existent-id",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(404)
	})

	it("DELETE /schedule/holidays/:id returns 404 for holiday of another tenant", async () => {
		const { cookie: otherCookie } = await createTenantAndLogin(app, {
			document: "97001002000307",
			email: `holidays-isolation+${Date.now()}@test.com`,
		})

		const created = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie: otherCookie },
			payload: { date: "2025-09-07", description: "Independência outro tenant" },
		})
		const { id } = created.json()

		const response = await app.inject({
			method: "DELETE",
			url: `/schedule/holidays/${id}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(404)
	})

	it("GET /schedule/holidays returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: "/schedule/holidays" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /schedule/available-slots
// ---------------------------------------------------------------------------

describe("GET /schedule/available-slots", () => {
	let cookie: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_SLOTS })
		cookie = result.cookie

		// Configure a schedule: Monday open 09:00–12:00
		await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie },
			payload: [
				{ dayOfWeek: "1", openTime: "09:00", closeTime: "12:00", isClosed: false },
				{ dayOfWeek: "0", openTime: null, closeTime: null, isClosed: true },
			],
		})

		// Add a holiday on a known Monday
		await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie },
			payload: { date: "2025-12-29", description: "Feriado de teste" },
		})
	})

	it("returns slots for open day with 60-minute duration", async () => {
		// 2025-01-06 is a Monday
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-06&duration=60",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(["09:00", "10:00", "11:00"])
	})

	it("returns empty array for closed day (Sunday)", async () => {
		// 2025-01-05 is a Sunday — is_closed = true in schedule
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-05&duration=60",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("returns empty array for day not in work schedule", async () => {
		// 2025-01-07 is a Tuesday — not in schedule
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-07&duration=60",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("returns empty array for holiday", async () => {
		// 2025-12-29 is a Monday but set as holiday
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-12-29&duration=60",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("returns empty array when duration exceeds operating hours", async () => {
		// 09:00–12:00 = 180 min total; 240 minutes doesn't fit
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-06&duration=240",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([])
	})

	it("returns 422 when date is missing", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?duration=60",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when duration is missing", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-06",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 for invalid date format", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=06-01-2025&duration=60",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when duration is 0", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-06&duration=0",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/schedule/available-slots?date=2025-01-06&duration=60",
		})
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// Authorization: collaborator cannot mutate
// ---------------------------------------------------------------------------

describe("collaborator authorization", () => {
	let ownerCookie: string
	let collaboratorCookie: string
	let tenantId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_COLLAB })
		ownerCookie = result.cookie
		tenantId = result.tenantId

		const collabEmail = `collab-schedule+${Date.now()}@test.com`

		const inviteRes = await app.inject({
			method: "POST",
			url: `/tenants/${tenantId}/members/invite`,
			headers: { cookie: ownerCookie },
			payload: { email: collabEmail, role: "collaborator" },
		})

		if (inviteRes.statusCode === 201) {
			const signIn = await app.inject({
				method: "POST",
				url: "/auth/sign-in/email",
				payload: { email: collabEmail, password: PASSWORD },
			})
			const cookies = signIn.headers["set-cookie"] as string | string[]
			collaboratorCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies
		} else {
			// Fallback: downgrade owner's own role to collaborator for this test
			const [member] = await db
				.select({ id: tenantMembers.id })
				.from(tenantMembers)
				.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "owner")))
				.limit(1)

			if (member) {
				await db
					.update(tenantMembers)
					.set({ role: "collaborator" })
					.where(eq(tenantMembers.id, member.id))
			}
			collaboratorCookie = ownerCookie
		}
	})

	it("collaborator cannot PUT /schedule — returns 403", async () => {
		const response = await app.inject({
			method: "PUT",
			url: "/schedule",
			headers: { cookie: collaboratorCookie },
			payload: [{ dayOfWeek: "1", openTime: "08:00", closeTime: "18:00", isClosed: false }],
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot POST /schedule/holidays — returns 403", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/schedule/holidays",
			headers: { cookie: collaboratorCookie },
			payload: { date: "2025-11-15", description: "Proclamação" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot DELETE /schedule/holidays/:id — returns 403", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/schedule/holidays/some-id",
			headers: { cookie: collaboratorCookie },
		})
		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// Subscription guard: 402 for expired tenant
// ---------------------------------------------------------------------------

describe("subscription-guard on schedule", () => {
	it("returns 402 for tenant with expired subscription", async () => {
		const { cookie, tenantId } = await createTenantAndLogin(app, { document: CNPJ_SUBSCRIPTION })

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/schedule",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(402)
	})
})

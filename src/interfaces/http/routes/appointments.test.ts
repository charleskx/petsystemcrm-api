import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { db } from "../../../infra/database/drizzle/client"
import { tenants, tenantMembers } from "../../../infra/database/drizzle/schema"
import { and, eq } from "drizzle-orm"

let app: FastifyInstance

// Valid CNPJs — unique to this file, non-conflicting with other test files
const CNPJ_CREATE = "11000000000108"
const CNPJ_SLOT_INVALID = "22000000000124"
const CNPJ_PRICING_MISSING = "33000000000140"
const CNPJ_LIST = "44000000000167"
const CNPJ_DETAIL = "55000000000183"
const CNPJ_UPDATE = "66000000000108"
const CNPJ_STATUS = "77000000000116"
const CNPJ_CANCEL = "88000000000132"
const CNPJ_COLLAB = "99000000000159"
const CNPJ_SUBSCRIPTION = "10000000000145"

const PASSWORD = "senha1234"

const baseAddress = {
	addressZip: "01310100",
	addressStreet: "Avenida Paulista",
	addressNumber: "1000",
	addressNeighborhood: "Bela Vista",
	addressCity: "São Paulo",
	addressState: "SP",
}

// 2025-01-06 is a Monday
const MONDAY_DATE = "2025-01-06"
const SLOT_09 = `${MONDAY_DATE}T09:00:00.000Z`
const SLOT_10 = `${MONDAY_DATE}T10:00:00.000Z`

async function createTenantAndLogin(
	app: FastifyInstance,
	opts: { document: string; email?: string },
): Promise<{ cookie: string; tenantId: string; userId: string }> {
	const email = opts.email ?? `appointments-test+${Date.now()}+${Math.random()}@test.com`

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

async function configureSchedule(app: FastifyInstance, cookie: string) {
	await app.inject({
		method: "PUT",
		url: "/schedule",
		headers: { cookie },
		payload: [{ dayOfWeek: "1", openTime: "09:00", closeTime: "18:00", isClosed: false }],
	})
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

async function createPet(app: FastifyInstance, cookie: string, clientId: string, size = "medium"): Promise<string> {
	const res = await app.inject({
		method: "POST",
		url: `/clients/${clientId}/pets`,
		headers: { cookie },
		payload: { name: "Rex", species: "Cachorro", size },
	})
	return res.json().id
}

async function createService(app: FastifyInstance, cookie: string, durationMinutes = 60): Promise<string> {
	const res = await app.inject({
		method: "POST",
		url: "/services",
		headers: { cookie },
		payload: { name: "Banho e Tosa", durationMinutes },
	})
	return res.json().id
}

async function addPricing(app: FastifyInstance, cookie: string, serviceId: string, size = "medium", price = "80.00") {
	await app.inject({
		method: "PUT",
		url: `/services/${serviceId}/pricing`,
		headers: { cookie },
		payload: [{ petSize: size, price }],
	})
}

async function createAppointment(
	app: FastifyInstance,
	cookie: string,
	opts: { clientId: string; petId: string; serviceIds: string[]; scheduledAt: string },
) {
	return app.inject({
		method: "POST",
		url: "/appointments",
		headers: { cookie },
		payload: {
			clientId: opts.clientId,
			petId: opts.petId,
			scheduledAt: opts.scheduledAt,
			paymentMethod: "pix",
			serviceIds: opts.serviceIds,
		},
	})
}

beforeAll(async () => {
	app = await buildApp()
	await app.ready()
})

afterAll(async () => {
	await app.close()
})

// ---------------------------------------------------------------------------
// POST /appointments — create
// ---------------------------------------------------------------------------

describe("POST /appointments — slot válido", () => {
	let cookie: string
	let clientId: string
	let petId: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_CREATE })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		clientId = await createClient(app, cookie)
		petId = await createPet(app, cookie, clientId)
		serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)
	})

	it("creates appointment and returns 201 with services and totalAmount", async () => {
		const response = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})

		expect(response.statusCode).toBe(201)
		const body = response.json()
		expect(body).toHaveProperty("id")
		expect(body.status).toBe("scheduled")
		expect(body.totalAmount).toBe("80.00")
		expect(body.services).toHaveLength(1)
		expect(body.services[0].price).toBe("80.00")
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/appointments",
			payload: {
				clientId,
				petId,
				scheduledAt: SLOT_10,
				paymentMethod: "pix",
				serviceIds: [serviceId],
			},
		})
		expect(response.statusCode).toBe(401)
	})

	it("returns 422 for empty serviceIds", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/appointments",
			headers: { cookie },
			payload: { clientId, petId, scheduledAt: SLOT_10, paymentMethod: "pix", serviceIds: [] },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 404 when client belongs to another tenant", async () => {
		const other = await createTenantAndLogin(app, {
			document: "10900000000100",
			email: `appt-isolation+${Date.now()}@test.com`,
		})
		const response = await createAppointment(app, other.cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_10,
		})
		expect(response.statusCode).toBe(404)
	})
})

describe("POST /appointments — slot indisponível", () => {
	let cookie: string
	let clientId: string
	let petId: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_SLOT_INVALID })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		clientId = await createClient(app, cookie)
		petId = await createPet(app, cookie, clientId)
		serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)
	})

	it("returns 422 when scheduledAt is not an available slot", async () => {
		// 08:00 is before the schedule opens at 09:00 — not a valid slot
		const response = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: `${MONDAY_DATE}T08:00:00.000Z`,
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when slot is already booked", async () => {
		// First booking succeeds
		const first = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		expect(first.statusCode).toBe(201)

		// Second booking at same slot fails
		const second = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		expect(second.statusCode).toBe(422)
	})
})

describe("POST /appointments — precificação ausente", () => {
	let cookie: string
	let clientId: string
	let petId: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_PRICING_MISSING })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		clientId = await createClient(app, cookie)
		// Pet with size "large" but pricing only set for "small"
		petId = await createPet(app, cookie, clientId, "large")
		serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId, "small", "50.00")
	})

	it("returns 422 when no pricing exists for pet size", async () => {
		const response = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		expect(response.statusCode).toBe(422)
	})
})

// ---------------------------------------------------------------------------
// GET /appointments
// ---------------------------------------------------------------------------

describe("GET /appointments", () => {
	let cookie: string
	let clientId: string
	let petId: string
	let serviceId: string
	let appointmentId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_LIST })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		clientId = await createClient(app, cookie)
		petId = await createPet(app, cookie, clientId)
		serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)

		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		appointmentId = res.json().id
	})

	it("returns 200 with list of appointments", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/appointments",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data).toBeInstanceOf(Array)
		expect(body.data.length).toBeGreaterThanOrEqual(1)
	})

	it("filters by date", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/appointments?date=${MONDAY_DATE}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.every((a: { scheduledAt: string }) => a.scheduledAt.startsWith("2025-01-06"))).toBe(true)
	})

	it("filters by status", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/appointments?status=scheduled",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.every((a: { status: string }) => a.status === "scheduled")).toBe(true)
	})

	it("filters by clientId", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/appointments?clientId=${clientId}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.every((a: { clientId: string }) => a.clientId === clientId)).toBe(true)
	})

	it("filters by petId", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/appointments?petId=${petId}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body.data.every((a: { petId: string }) => a.petId === petId)).toBe(true)
	})

	it("isolates by tenant", async () => {
		const { cookie: otherCookie } = await createTenantAndLogin(app, {
			document: "20000000000107",
			email: `appt-list-isolation+${Date.now()}@test.com`,
		})
		const response = await app.inject({
			method: "GET",
			url: "/appointments",
			headers: { cookie: otherCookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		const ids = body.data.map((a: { id: string }) => a.id)
		expect(ids).not.toContain(appointmentId)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: "/appointments" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// GET /appointments/:id
// ---------------------------------------------------------------------------

describe("GET /appointments/:id", () => {
	let cookie: string
	let appointmentId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_DETAIL })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		const clientId = await createClient(app, cookie)
		const petId = await createPet(app, cookie, clientId)
		const serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)

		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		appointmentId = res.json().id
	})

	it("returns 200 with appointment detail including client, pet and services", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/appointments/${appointmentId}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("id", appointmentId)
		expect(body.client).toHaveProperty("name")
		expect(body.pet).toHaveProperty("name")
		expect(body.services).toBeInstanceOf(Array)
		expect(body.services[0]).toHaveProperty("durationMinutes")
		expect(body.services[0]).toHaveProperty("price")
	})

	it("returns 404 for non-existent appointment", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/appointments/non-existent-id",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(404)
	})

	it("returns 404 for appointment of another tenant", async () => {
		const { cookie: otherCookie } = await createTenantAndLogin(app, {
			document: "30000000000152",
			email: `appt-detail-isolation+${Date.now()}@test.com`,
		})
		const response = await app.inject({
			method: "GET",
			url: `/appointments/${appointmentId}`,
			headers: { cookie: otherCookie },
		})
		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "GET", url: `/appointments/${appointmentId}` })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// PATCH /appointments/:id
// ---------------------------------------------------------------------------

describe("PATCH /appointments/:id", () => {
	let cookie: string
	let appointmentId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_UPDATE })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		const clientId = await createClient(app, cookie)
		const petId = await createPet(app, cookie, clientId)
		const serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)

		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		appointmentId = res.json().id
	})

	it("updates notes and returns 200", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${appointmentId}`,
			headers: { cookie },
			payload: { notes: "Observação importante" },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json().notes).toBe("Observação importante")
	})

	it("returns 422 when updating a cancelled appointment", async () => {
		// Cancel the appointment first
		await app.inject({ method: "DELETE", url: `/appointments/${appointmentId}`, headers: { cookie } })

		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${appointmentId}`,
			headers: { cookie },
			payload: { notes: "Tentativa de edição" },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 404 for appointment of another tenant", async () => {
		const { cookie: otherCookie } = await createTenantAndLogin(app, {
			document: "40000000000106",
			email: `appt-update-isolation+${Date.now()}@test.com`,
		})
		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${appointmentId}`,
			headers: { cookie: otherCookie },
			payload: { notes: "test" },
		})
		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${appointmentId}`,
			payload: { notes: "test" },
		})
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// PATCH /appointments/:id/status
// ---------------------------------------------------------------------------

describe("PATCH /appointments/:id/status", () => {
	let cookie: string
	let clientId: string
	let petId: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_STATUS })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		clientId = await createClient(app, cookie)
		petId = await createPet(app, cookie, clientId)
		serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)
	})

	it("transitions scheduled → in_progress and returns 200", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		const id = res.json().id

		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "in_progress" },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json().status).toBe("in_progress")
	})

	it("transitions in_progress → completed and returns 200", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_10,
		})
		const id = res.json().id

		await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "in_progress" },
		})

		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "completed" },
		})
		expect(response.statusCode).toBe(200)
		expect(response.json().status).toBe("completed")
	})

	it("returns 422 for invalid transition (completed → in_progress)", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: `${MONDAY_DATE}T11:00:00.000Z`,
		})
		const id = res.json().id

		await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "in_progress" },
		})
		await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "completed" },
		})

		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "in_progress" },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/appointments/some-id/status",
			payload: { status: "in_progress" },
		})
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// DELETE /appointments/:id — cancel
// ---------------------------------------------------------------------------

describe("DELETE /appointments/:id", () => {
	let cookie: string
	let clientId: string
	let petId: string
	let serviceId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_CANCEL })
		cookie = result.cookie
		await configureSchedule(app, cookie)
		clientId = await createClient(app, cookie)
		petId = await createPet(app, cookie, clientId)
		serviceId = await createService(app, cookie)
		await addPricing(app, cookie, serviceId)
	})

	it("cancels appointment and returns 204", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		const id = res.json().id

		const response = await app.inject({
			method: "DELETE",
			url: `/appointments/${id}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(204)

		const detail = await app.inject({
			method: "GET",
			url: `/appointments/${id}`,
			headers: { cookie },
		})
		expect(detail.json().status).toBe("cancelled")
	})

	it("returns 422 when cancelling already cancelled appointment", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_10,
		})
		const id = res.json().id

		await app.inject({ method: "DELETE", url: `/appointments/${id}`, headers: { cookie } })

		const response = await app.inject({
			method: "DELETE",
			url: `/appointments/${id}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 422 when cancelling a completed appointment", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: `${MONDAY_DATE}T12:00:00.000Z`,
		})
		const id = res.json().id

		await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "in_progress" },
		})
		await app.inject({
			method: "PATCH",
			url: `/appointments/${id}/status`,
			headers: { cookie },
			payload: { status: "completed" },
		})

		const response = await app.inject({
			method: "DELETE",
			url: `/appointments/${id}`,
			headers: { cookie },
		})
		expect(response.statusCode).toBe(422)
	})

	it("returns 404 for appointment of another tenant", async () => {
		const res = await createAppointment(app, cookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: `${MONDAY_DATE}T13:00:00.000Z`,
		})
		const id = res.json().id

		const { cookie: otherCookie } = await createTenantAndLogin(app, {
			document: "50000000000160",
			email: `appt-cancel-isolation+${Date.now()}@test.com`,
		})

		const response = await app.inject({
			method: "DELETE",
			url: `/appointments/${id}`,
			headers: { cookie: otherCookie },
		})
		expect(response.statusCode).toBe(404)
	})

	it("returns 401 without authentication", async () => {
		const response = await app.inject({ method: "DELETE", url: "/appointments/some-id" })
		expect(response.statusCode).toBe(401)
	})
})

// ---------------------------------------------------------------------------
// Authorization: collaborator cannot mutate (PATCH/DELETE)
// ---------------------------------------------------------------------------

describe("collaborator authorization", () => {
	let ownerCookie: string
	let collaboratorCookie: string
	let appointmentId: string

	beforeAll(async () => {
		const result = await createTenantAndLogin(app, { document: CNPJ_COLLAB })
		ownerCookie = result.cookie
		const tenantId = result.tenantId

		await configureSchedule(app, ownerCookie)
		const clientId = await createClient(app, ownerCookie)
		const petId = await createPet(app, ownerCookie, clientId)
		const serviceId = await createService(app, ownerCookie)
		await addPricing(app, ownerCookie, serviceId)

		const res = await createAppointment(app, ownerCookie, {
			clientId,
			petId,
			serviceIds: [serviceId],
			scheduledAt: SLOT_09,
		})
		appointmentId = res.json().id

		const collabEmail = `collab-appt+${Date.now()}@test.com`
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
			const [member] = await db
				.select({ id: tenantMembers.id })
				.from(tenantMembers)
				.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "owner")))
				.limit(1)

			if (member) {
				await db.update(tenantMembers).set({ role: "collaborator" }).where(eq(tenantMembers.id, member.id))
			}
			collaboratorCookie = ownerCookie
		}
	})

	it("collaborator cannot PATCH /appointments/:id — returns 403", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${appointmentId}`,
			headers: { cookie: collaboratorCookie },
			payload: { notes: "Tentativa" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot PATCH /appointments/:id/status — returns 403", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: `/appointments/${appointmentId}/status`,
			headers: { cookie: collaboratorCookie },
			payload: { status: "in_progress" },
		})
		expect(response.statusCode).toBe(403)
	})

	it("collaborator cannot DELETE /appointments/:id — returns 403", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/appointments/${appointmentId}`,
			headers: { cookie: collaboratorCookie },
		})
		expect(response.statusCode).toBe(403)
	})
})

// ---------------------------------------------------------------------------
// Subscription guard: 402 for expired tenant
// ---------------------------------------------------------------------------

describe("subscription-guard on appointments", () => {
	it("returns 402 for tenant with expired subscription", async () => {
		const { cookie, tenantId } = await createTenantAndLogin(app, { document: CNPJ_SUBSCRIPTION })

		await db.update(tenants).set({ subscriptionStatus: "expired" }).where(eq(tenants.id, tenantId))

		const response = await app.inject({
			method: "GET",
			url: "/appointments",
			headers: { cookie },
		})
		expect(response.statusCode).toBe(402)
	})
})

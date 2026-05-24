import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"

let app: FastifyInstance

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
			payload: { ...validPayload, email: `other+${Date.now()}@test.com`, document: "07526557000100" },
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
			payload: { ...validPayload, email: sharedEmail, document: "34218338000103" },
		})
		// Duplicate email
		const response = await app.inject({
			method: "POST",
			url: "/tenants",
			payload: { ...validPayload, email: sharedEmail, document: "30608418000119" },
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

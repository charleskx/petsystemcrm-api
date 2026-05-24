import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"

let app: FastifyInstance

const testEmail = `auth-test+${Date.now()}@test.com`
const testPassword = "senha1234"

beforeAll(async () => {
	app = await buildApp()
	await app.ready()

	// Create a user to test sign-in
	await app.inject({
		method: "POST",
		url: "/tenants",
		payload: {
			tenantName: "Auth Test Shop",
			document: "62307952000183", // valid CNPJ
			documentType: "cnpj",
			userName: "Auth User",
			email: testEmail,
			password: testPassword,
		},
	})
})

afterAll(async () => {
	await app.close()
})

describe("POST /auth/sign-in/email", () => {
	it("returns 200 and sets session cookie on valid credentials", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email: testEmail, password: testPassword },
		})

		expect(response.statusCode).toBe(200)
		const cookies = response.headers["set-cookie"]
		expect(cookies).toBeDefined()
	})

	it("returns 401 on wrong password", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email: testEmail, password: "wrong-password" },
		})
		expect(response.statusCode).toBe(401)
	})

	it("returns 401 on non-existent email (no user enumeration)", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email: "nobody@example.com", password: testPassword },
		})
		expect(response.statusCode).toBe(401)
	})
})

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../main/server"
import type { FastifyInstance } from "fastify"
import { authenticate } from "./authenticate"

let app: FastifyInstance

beforeAll(async () => {
	app = await buildApp()

	// Add a protected test route
	app.get("/test-protected", { preHandler: [authenticate] }, async (request) => {
		return {
			userId: request.userId,
			tenantId: request.tenantId,
			role: request.role,
		}
	})

	await app.ready()
})

afterAll(async () => {
	await app.close()
})

describe("authenticate middleware", () => {
	it("returns 401 when no session cookie is present", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/test-protected",
		})
		expect(response.statusCode).toBe(401)
		expect(response.json().error).toBe("Não autenticado")
	})

	it("injects tenantId, userId and role when session is valid", async () => {
		// Register a tenant to get a valid user
		const email = `middleware-test+${Date.now()}@test.com`
		await app.inject({
			method: "POST",
			url: "/tenants",
			payload: {
				tenantName: "Middleware Test Shop",
				document: "12345678000195", // valid CNPJ
				documentType: "cnpj",
				userName: "Middleware User",
				email,
				password: "senha1234",
			},
		})

		// Sign in to get session cookie
		const signIn = await app.inject({
			method: "POST",
			url: "/auth/sign-in/email",
			payload: { email, password: "senha1234" },
		})

		expect(signIn.statusCode).toBe(200)

		const cookies = signIn.headers["set-cookie"] as string | string[]
		const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies

		const response = await app.inject({
			method: "GET",
			url: "/test-protected",
			headers: { cookie: cookieHeader },
		})

		expect(response.statusCode).toBe(200)
		const body = response.json()
		expect(body).toHaveProperty("userId")
		expect(body).toHaveProperty("tenantId")
		expect(body.role).toBe("owner")
	})
})

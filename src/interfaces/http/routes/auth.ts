import type { FastifyInstance } from "fastify"
import { auth } from "../../../infra/auth"

export async function authRoutes(app: FastifyInstance) {
	app.all(
		"/auth/*",
		{
			schema: {
				tags: ["Auth"],
				summary: "Auth proxy (better-auth)",
				description:
					"All authentication endpoints managed by better-auth (sign-in, sign-up, session, refresh, etc.)",
			},
		},
		async (request, reply) => {
			// Build a standard Web API Request so better-auth's handler works both
			// in production (real HTTP) and in tests (Fastify inject / light-my-request).
			const url = new URL(request.url, `http://${request.hostname}`)

			const headers = new Headers()
			for (const [key, value] of Object.entries(request.headers)) {
				if (value === undefined) continue
				if (Array.isArray(value)) {
					for (const v of value) headers.append(key, v)
				} else {
					headers.set(key, value)
				}
			}

			const hasBody = request.method !== "GET" && request.method !== "HEAD"
			const body = hasBody ? JSON.stringify(request.body) : undefined

			const webRequest = new Request(url.toString(), {
				method: request.method,
				headers,
				body,
			})

			const response = await auth.handler(webRequest)

			reply.status(response.status)
			for (const [key, value] of response.headers.entries()) {
				reply.header(key, value)
			}

			const buffer = await response.arrayBuffer()
			return reply.send(Buffer.from(buffer))
		},
	)
}

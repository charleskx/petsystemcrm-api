import type { FastifyInstance } from "fastify"
import { toNodeHandler } from "better-auth/node"
import { auth } from "../../../infra/auth"

export async function authRoutes(app: FastifyInstance) {
	const handler = toNodeHandler(auth)

	// Delegate all /auth/* requests to better-auth — reply.hijack() prevents Fastify from touching the response
	app.all("/auth/*", async (request, reply) => {
		reply.hijack()
		return handler(request.raw, reply.raw)
	})
}

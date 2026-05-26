import type { FastifyInstance } from "fastify"

export async function healthRoutes(app: FastifyInstance) {
	app.get(
		"/health",
		{
			schema: {
				tags: ["Health"],
				summary: "Health check",
				response: {
					200: {
						type: "object",
						properties: { status: { type: "string" } },
					},
				},
			},
		},
		async (_request, reply) => {
			return reply.send({ status: "ok" })
		},
	)
}

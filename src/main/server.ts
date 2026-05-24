import Fastify from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import cookie from "@fastify/cookie"
import multipart from "@fastify/multipart"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import { env } from "./config/env"
import { authRoutes } from "../interfaces/http/routes/auth"
import { healthRoutes } from "../interfaces/http/routes/health"
import { tenantsRoutes } from "../interfaces/http/routes/tenants"
import { clientsRoutes } from "../interfaces/http/routes/clients"

export async function buildApp() {
	const app = Fastify({
		logger: env.NODE_ENV !== "test",
	})

	// Security
	await app.register(helmet, { contentSecurityPolicy: false })
	await app.register(cors, {
		origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
		credentials: true,
	})
	await app.register(rateLimit, { max: 100, timeWindow: "1 minute" })

	// Cookie support required by better-auth
	await app.register(cookie)

	// Multipart support for file uploads
	await app.register(multipart)

	// OpenAPI docs
	await app.register(swagger, {
		openapi: {
			info: { title: "PetSystem CRM API", version: "1.0.0", description: "Multi-tenant pet shop management API" },
			components: { securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "better-auth.session_token" } } },
		},
	})
	await app.register(swaggerUi, { routePrefix: "/documentation" })

	// Public routes — registered before any auth guard
	await app.register(healthRoutes)
	await app.register(authRoutes)
	await app.register(tenantsRoutes)

	// Authenticated routes
	await app.register(clientsRoutes)

	return app
}

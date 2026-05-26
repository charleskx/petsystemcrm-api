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
import { membersRoutes } from "../interfaces/http/routes/members"
import { petsRoutes } from "../interfaces/http/routes/pets"
import { servicesRoutes } from "../interfaces/http/routes/services"
import { scheduleRoutes } from "../interfaces/http/routes/schedule"
import { appointmentsRoutes } from "../interfaces/http/routes/appointments"
import { productsRoutes } from "../interfaces/http/routes/products"
import { stockRoutes } from "../interfaces/http/routes/stock"
import { suppliersRoutes } from "../interfaces/http/routes/suppliers"
import { salesRoutes } from "../interfaces/http/routes/sales"
import { billingRoutes } from "../interfaces/http/routes/billing"
import { paymentsRoutes } from "../interfaces/http/routes/payments"

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
	await app.register(rateLimit, { max: env.NODE_ENV === "test" ? 10000 : 100, timeWindow: "1 minute" })

	// Cookie support required by better-auth
	await app.register(cookie)

	// Multipart support for file uploads
	await app.register(multipart)

	// OpenAPI docs
	await app.register(swagger, {
		openapi: {
			info: { title: "PetSystem CRM API", version: "1.0.0", description: "Multi-tenant pet shop management API" },
			servers: [{ url: env.API_URL || "http://localhost:3333", description: "API Server" }],
			tags: [
				{ name: "Health", description: "Health check" },
				{ name: "Auth", description: "Authentication (better-auth)" },
				{ name: "Tenants", description: "Tenant management" },
				{ name: "Members", description: "Tenant member management" },
				{ name: "Clients", description: "Client management" },
				{ name: "Pets", description: "Pet management" },
				{ name: "Services", description: "Service catalog" },
				{ name: "Schedule", description: "Work schedule and holidays" },
				{ name: "Appointments", description: "Appointment management" },
				{ name: "Products", description: "Product and category management" },
				{ name: "Stock", description: "Stock movements" },
				{ name: "Suppliers", description: "Supplier management (premium)" },
				{ name: "Sales", description: "Sales / POS (premium)" },
				{ name: "Billing", description: "Subscription billing" },
				{ name: "Payments", description: "Payment webhooks" },
			],
			components: { securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "better-auth.session_token" } } },
		},
	})
	await app.register(swaggerUi, { routePrefix: "/documentation" })

	// Public routes — registered before any auth guard
	await app.register(healthRoutes)
	await app.register(authRoutes)
	await app.register(tenantsRoutes)
	await app.register(paymentsRoutes)

	// Authenticated routes
	await app.register(clientsRoutes)
	await app.register(membersRoutes)
	await app.register(petsRoutes)
	await app.register(servicesRoutes)
	await app.register(scheduleRoutes)
	await app.register(appointmentsRoutes)
	await app.register(productsRoutes)
	await app.register(stockRoutes)
	await app.register(suppliersRoutes)
	await app.register(salesRoutes)
	await app.register(billingRoutes)

	return app
}

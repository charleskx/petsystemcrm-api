import type { MemberRole } from "../../domain/tenant/tenant.entity"

declare module "fastify" {
	interface FastifyRequest {
		tenantId: string
		userId: string
		role: MemberRole
	}
}

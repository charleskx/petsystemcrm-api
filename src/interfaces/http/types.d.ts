import type { MemberRole } from "../../domain/tenant/tenant.entity"
import type { AppAbility } from "../../infra/auth/ability"

declare module "fastify" {
	interface FastifyRequest {
		tenantId: string
		userId: string
		role: MemberRole
		ability: AppAbility
	}
}

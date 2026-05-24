import { eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { tenantMembers } from "../../infra/database/drizzle/schema"
import { user } from "../../infra/database/drizzle/schema/auth"

export interface ListMembersInput {
	tenantId: string
}

export interface MemberOutput {
	userId: string
	name: string
	email: string
	role: "owner" | "financial" | "collaborator"
	joinedAt: Date
}

export async function listMembers(input: ListMembersInput): Promise<MemberOutput[]> {
	const rows = await db
		.select({
			userId: tenantMembers.userId,
			name: user.name,
			email: user.email,
			role: tenantMembers.role,
			joinedAt: tenantMembers.createdAt,
		})
		.from(tenantMembers)
		.innerJoin(user, eq(tenantMembers.userId, user.id))
		.where(eq(tenantMembers.tenantId, input.tenantId))
		.orderBy(tenantMembers.createdAt)

	return rows as MemberOutput[]
}

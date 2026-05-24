import { and, count, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { tenantMembers } from "../../infra/database/drizzle/schema"
import { LastOwnerError, MemberNotFoundError } from "./update-member-role.use-case"

export interface RemoveMemberInput {
	tenantId: string
	userId: string
}

export async function removeMember(input: RemoveMemberInput): Promise<void> {
	const { tenantId, userId } = input

	const member = await db
		.select({ id: tenantMembers.id, role: tenantMembers.role })
		.from(tenantMembers)
		.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
		.limit(1)
		.then((rows) => rows[0])

	if (!member) {
		throw new MemberNotFoundError()
	}

	if (member.role === "owner") {
		const [{ value: ownerCount }] = await db
			.select({ value: count() })
			.from(tenantMembers)
			.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "owner")))

		if (Number(ownerCount) === 1) {
			throw new LastOwnerError()
		}
	}

	await db
		.delete(tenantMembers)
		.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
}

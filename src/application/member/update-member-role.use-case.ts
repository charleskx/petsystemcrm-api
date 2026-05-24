import { and, count, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { tenantMembers } from "../../infra/database/drizzle/schema"

export interface UpdateMemberRoleInput {
	tenantId: string
	userId: string
	role: "owner" | "financial" | "collaborator"
}

export interface UpdateMemberRoleOutput {
	userId: string
	role: "owner" | "financial" | "collaborator"
}

export class LastOwnerError extends Error {
	constructor() {
		super("Não é possível remover o único proprietário da empresa")
		this.name = "LastOwnerError"
	}
}

export class MemberNotFoundError extends Error {
	constructor() {
		super("Membro não encontrado")
		this.name = "MemberNotFoundError"
	}
}

export async function updateMemberRole(input: UpdateMemberRoleInput): Promise<UpdateMemberRoleOutput> {
	const { tenantId, userId, role } = input

	const member = await db
		.select({ id: tenantMembers.id, role: tenantMembers.role })
		.from(tenantMembers)
		.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
		.limit(1)
		.then((rows) => rows[0])

	if (!member) {
		throw new MemberNotFoundError()
	}

	if (member.role === "owner" && role !== "owner") {
		const [{ value: ownerCount }] = await db
			.select({ value: count() })
			.from(tenantMembers)
			.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "owner")))

		if (Number(ownerCount) === 1) {
			throw new LastOwnerError()
		}
	}

	await db
		.update(tenantMembers)
		.set({ role })
		.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))

	return { userId, role }
}

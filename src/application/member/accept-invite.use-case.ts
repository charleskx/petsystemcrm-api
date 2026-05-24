import { and, eq } from "drizzle-orm"
import { auth } from "../../infra/auth"
import { db } from "../../infra/database/drizzle/client"
import { tenantInvitations, tenantMembers } from "../../infra/database/drizzle/schema"

export interface AcceptInviteInput {
	tenantId: string
	token: string
	name: string
	password: string
}

export interface AcceptInviteOutput {
	userId: string
}

export class InviteNotFoundError extends Error {
	constructor() {
		super("Convite não encontrado")
		this.name = "InviteNotFoundError"
	}
}

export class InviteExpiredError extends Error {
	constructor() {
		super("Este convite expirou")
		this.name = "InviteExpiredError"
	}
}

export async function acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteOutput> {
	const { tenantId, token, name, password } = input

	const invitation = await db
		.select()
		.from(tenantInvitations)
		.where(and(eq(tenantInvitations.token, token), eq(tenantInvitations.tenantId, tenantId)))
		.limit(1)
		.then((rows) => rows[0])

	if (!invitation) {
		throw new InviteNotFoundError()
	}

	if (invitation.expiresAt < new Date()) {
		throw new InviteExpiredError()
	}

	const userResult = await auth.api.signUpEmail({
		body: { name, email: invitation.email, password },
	})

	const userId = userResult.user.id

	await db.transaction(async (tx) => {
		await tx.insert(tenantMembers).values({
			id: crypto.randomUUID(),
			tenantId,
			userId,
			role: invitation.role,
		})

		await tx.delete(tenantInvitations).where(eq(tenantInvitations.id, invitation.id))
	})

	return { userId }
}

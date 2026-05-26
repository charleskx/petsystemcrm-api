import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { tenantInvitations, tenantMembers } from "../../infra/database/drizzle/schema"
import { user } from "../../infra/database/drizzle/schema/auth"
import { getResend } from "../../infra/email/resend"
import { env } from "../../main/config/env"

export interface InviteMemberInput {
	tenantId: string
	tenantName: string
	email: string
	role: "owner" | "financial" | "collaborator"
}

export type InviteMemberOutput = { status: "added"; userId: string } | { status: "invited" }

export class MemberAlreadyExistsError extends Error {
	constructor() {
		super("Usuário já é membro desta empresa")
		this.name = "MemberAlreadyExistsError"
	}
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function inviteMember(input: InviteMemberInput): Promise<InviteMemberOutput> {
	const { tenantId, tenantName, email, role } = input

	const existingUser = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1)
		.then((rows) => rows[0])

	if (existingUser) {
		const alreadyMember = await db
			.select({ id: tenantMembers.id })
			.from(tenantMembers)
			.where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, existingUser.id)))
			.limit(1)
			.then((rows) => rows[0])

		if (alreadyMember) {
			throw new MemberAlreadyExistsError()
		}

		await db.insert(tenantMembers).values({
			id: crypto.randomUUID(),
			tenantId,
			userId: existingUser.id,
			role,
		})

		return { status: "added", userId: existingUser.id }
	}

	const token = crypto.randomUUID()
	const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

	await db.insert(tenantInvitations).values({
		id: crypto.randomUUID(),
		tenantId,
		email,
		role,
		token,
		expiresAt,
	})

	if (env.RESEND_API_KEY) {
		const acceptUrl = `${env.API_URL}/tenants/${tenantId}/members/accept-invite?token=${token}`

		await getResend().emails.send({
			from: "PetSystem CRM <noreply@petsystemcrm.com>",
			to: email,
			subject: `Você foi convidado para ${tenantName}`,
			html: `
				<p>Você foi convidado para fazer parte da empresa <strong>${tenantName}</strong> no PetSystem CRM.</p>
				<p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
				<p><a href="${acceptUrl}">${acceptUrl}</a></p>
				<p>Este link expira em 7 dias.</p>
			`,
		})
	}

	return { status: "invited" }
}

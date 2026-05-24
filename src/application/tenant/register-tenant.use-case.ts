import { eq } from "drizzle-orm"
import { auth } from "../../infra/auth"
import { db } from "../../infra/database/drizzle/client"
import { tenantMembers, tenants } from "../../infra/database/drizzle/schema"
import { createTrialEndsAt } from "../../domain/tenant/tenant.entity"

export interface RegisterTenantInput {
	tenantName: string
	document: string
	documentType: "cpf" | "cnpj"
	userName: string
	email: string
	password: string
}

export interface RegisterTenantOutput {
	tenantId: string
	trialEndsAt: Date
}

export class TenantAlreadyExistsError extends Error {
	readonly field: "document" | "email"

	constructor(field: "document" | "email") {
		super(field === "document" ? "Documento já cadastrado no sistema" : "E-mail já está em uso")
		this.name = "TenantAlreadyExistsError"
		this.field = field
	}
}

export async function registerTenant(input: RegisterTenantInput): Promise<RegisterTenantOutput> {
	const { tenantName, document, documentType, userName, email, password } = input

	const existing = await db
		.select({ id: tenants.id })
		.from(tenants)
		.where(eq(tenants.document, document))
		.limit(1)

	if (existing.length > 0) {
		throw new TenantAlreadyExistsError("document")
	}

	const trialEndsAt = createTrialEndsAt()
	const tenantId = crypto.randomUUID()

	// Create user via better-auth — outside db.transaction since better-auth manages its own connection
	let userId: string
	try {
		const userResult = await auth.api.signUpEmail({
			body: { name: userName, email, password },
		})
		userId = userResult.user.id
	} catch (error) {
		const msg = String(error instanceof Error ? error.message : error).toLowerCase()
		if (msg.includes("email") || msg.includes("exist") || msg.includes("already") || msg.includes("use")) {
			throw new TenantAlreadyExistsError("email")
		}
		throw error
	}

	try {
		await db.transaction(async (tx) => {
			await tx.insert(tenants).values({
				id: tenantId,
				name: tenantName,
				document,
				documentType,
				plan: "essential",
				subscriptionStatus: "trial",
				trialEndsAt,
			})

			await tx.insert(tenantMembers).values({
				id: crypto.randomUUID(),
				tenantId,
				userId,
				role: "owner",
			})
		})
	} catch (error) {
		// Best-effort compensation: log orphaned user for manual cleanup
		console.error(`[ORPHAN] User created but tenant insert failed. userId=${userId} email=${email}`)
		throw error
	}

	return { tenantId, trialEndsAt }
}

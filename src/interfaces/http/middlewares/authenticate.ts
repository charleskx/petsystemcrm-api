import { eq } from "drizzle-orm"
import type { FastifyReply, FastifyRequest } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../../../infra/auth"
import { db } from "../../../infra/database/drizzle/client"
import { tenantMembers } from "../../../infra/database/drizzle/schema"

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.raw.headers),
	})

	if (!session) {
		reply.status(401).send({ error: "Não autenticado" })
		return
	}

	const member = await db
		.select()
		.from(tenantMembers)
		.where(eq(tenantMembers.userId, session.user.id))
		.limit(1)
		.then((rows) => rows[0])

	if (!member) {
		reply.status(401).send({ error: "Usuário não pertence a nenhuma empresa" })
		return
	}

	request.userId = session.user.id
	request.tenantId = member.tenantId
	request.role = member.role as "owner" | "financial" | "collaborator"
}

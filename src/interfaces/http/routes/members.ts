import type { FastifyInstance } from "fastify"
import { z } from "zod/v4"
import { authenticate } from "../middlewares/authenticate"
import { listMembers } from "../../../application/member/list-members.use-case"
import {
	inviteMember,
	MemberAlreadyExistsError,
} from "../../../application/member/invite-member.use-case"
import {
	acceptInvite,
	InviteNotFoundError,
	InviteExpiredError,
} from "../../../application/member/accept-invite.use-case"
import {
	updateMemberRole,
	LastOwnerError,
	MemberNotFoundError,
} from "../../../application/member/update-member-role.use-case"
import { removeMember } from "../../../application/member/remove-member.use-case"
import { getTenant, TenantNotFoundError } from "../../../application/tenant/get-tenant.use-case"
import {
	errorSchema,
	notFoundSchema,
	unauthorizedSchema,
	forbiddenSchema,
	unprocessableSchema,
} from "../schemas/shared"

const memberRoleSchema = z.enum(["owner", "financial", "collaborator"])

const inviteBody = z.object({
	email: z.email(),
	role: memberRoleSchema,
})

const acceptInviteBody = z.object({
	name: z.string().min(2).max(255),
	password: z.string().min(8),
})

const updateRoleBody = z.object({
	role: memberRoleSchema,
})

export async function membersRoutes(app: FastifyInstance) {
	app.get(
		"/tenants/:tenantId/members",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Members"],
				summary: "List tenant members",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["tenantId"],
					properties: { tenantId: { type: "string" } },
				},
				response: {
					200: { type: "array", items: { type: "object", additionalProperties: true } },
					401: unauthorizedSchema,
					403: forbiddenSchema,
				},
			},
		},
		async (request, reply) => {
			const { tenantId } = request.params as { tenantId: string }

			if (request.tenantId !== tenantId) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			const members = await listMembers({ tenantId })
			return reply.send(members)
		},
	)

	app.post(
		"/tenants/:tenantId/members/invite",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Members"],
				summary: "Invite member",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["tenantId"],
					properties: { tenantId: { type: "string" } },
				},
				body: {
					type: "object",
					properties: {
						email: { type: "string" },
						role: { type: "string" },
					},
				},
				response: {
					201: { type: "object", additionalProperties: true },
					202: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					409: errorSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const { tenantId } = request.params as { tenantId: string }

			if (request.tenantId !== tenantId) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			if (request.ability.cannot("create", "Member")) {
				return reply.status(403).send({ error: "Apenas o proprietário pode convidar membros" })
			}

			const result = inviteBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			let tenantName: string
			try {
				const tenant = await getTenant(tenantId)
				tenantName = tenant.name
			} catch (error) {
				if (error instanceof TenantNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}

			try {
				const output = await inviteMember({ tenantId, tenantName, ...result.data })
				return reply.status(output.status === "added" ? 201 : 202).send(output)
			} catch (error) {
				if (error instanceof MemberAlreadyExistsError) {
					return reply.status(409).send({ error: error.message })
				}
				throw error
			}
		},
	)

	// Public endpoint — no authenticate preHandler
	app.post(
		"/tenants/:tenantId/members/accept-invite",
		{
			schema: {
				tags: ["Members"],
				summary: "Accept member invite",
				params: {
					type: "object",
					required: ["tenantId"],
					properties: { tenantId: { type: "string" } },
				},
				querystring: {
					type: "object",
					properties: { token: { type: "string" } },
				},
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						password: { type: "string" },
					},
				},
				response: {
					201: { type: "object", additionalProperties: true },
					404: notFoundSchema,
					410: errorSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const { tenantId } = request.params as { tenantId: string }
			const { token } = request.query as { token?: string }

			if (!token) {
				return reply.status(422).send({ error: "Token de convite obrigatório" })
			}

			const result = acceptInviteBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const output = await acceptInvite({ tenantId, token, ...result.data })
				return reply.status(201).send(output)
			} catch (error) {
				if (error instanceof InviteNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				if (error instanceof InviteExpiredError) {
					return reply.status(410).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.patch(
		"/tenants/:tenantId/members/:userId",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Members"],
				summary: "Update member role",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["tenantId", "userId"],
					properties: {
						tenantId: { type: "string" },
						userId: { type: "string" },
					},
				},
				body: {
					type: "object",
					properties: {
						role: { type: "string" },
					},
				},
				response: {
					200: { type: "object", additionalProperties: true },
					401: unauthorizedSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					409: errorSchema,
					422: unprocessableSchema,
				},
			},
		},
		async (request, reply) => {
			const { tenantId, userId } = request.params as { tenantId: string; userId: string }

			if (request.tenantId !== tenantId) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			if (request.ability.cannot("update", "Member")) {
				return reply.status(403).send({ error: "Apenas o proprietário pode alterar roles" })
			}

			const result = updateRoleBody.safeParse(request.body)
			if (!result.success) {
				return reply.status(422).send({
					error: "Dados inválidos",
					details: z.treeifyError(result.error),
				})
			}

			try {
				const output = await updateMemberRole({ tenantId, userId, role: result.data.role })
				return reply.send(output)
			} catch (error) {
				if (error instanceof LastOwnerError) {
					return reply.status(409).send({ error: error.message })
				}
				if (error instanceof MemberNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)

	app.delete(
		"/tenants/:tenantId/members/:userId",
		{
			preHandler: authenticate,
			schema: {
				tags: ["Members"],
				summary: "Remove member",
				security: [{ cookieAuth: [] }],
				params: {
					type: "object",
					required: ["tenantId", "userId"],
					properties: {
						tenantId: { type: "string" },
						userId: { type: "string" },
					},
				},
				response: {
					204: { type: "null" },
					401: unauthorizedSchema,
					403: forbiddenSchema,
					404: notFoundSchema,
					409: errorSchema,
				},
			},
		},
		async (request, reply) => {
			const { tenantId, userId } = request.params as { tenantId: string; userId: string }

			if (request.tenantId !== tenantId) {
				return reply.status(403).send({ error: "Acesso negado" })
			}

			if (request.ability.cannot("delete", "Member")) {
				return reply.status(403).send({ error: "Apenas o proprietário pode remover membros" })
			}

			try {
				await removeMember({ tenantId, userId })
				return reply.status(204).send()
			} catch (error) {
				if (error instanceof LastOwnerError) {
					return reply.status(409).send({ error: error.message })
				}
				if (error instanceof MemberNotFoundError) {
					return reply.status(404).send({ error: error.message })
				}
				throw error
			}
		},
	)
}

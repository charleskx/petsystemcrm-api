import { and, count, eq, ilike } from "drizzle-orm"
import type { ClientProps } from "../../domain/client/client.entity"
import { db } from "../../infra/database/drizzle/client"
import { clients } from "../../infra/database/drizzle/schema"

export interface ListClientsInput {
	tenantId: string
	page?: number
	limit?: number
	name?: string
	document?: string
}

export interface ListClientsOutput {
	data: ClientProps[]
	total: number
	page: number
	limit: number
}

export async function listClients(input: ListClientsInput): Promise<ListClientsOutput> {
	const page = Math.max(1, input.page ?? 1)
	const limit = Math.min(100, Math.max(1, input.limit ?? 20))
	const offset = (page - 1) * limit

	const conditions = [
		eq(clients.tenantId, input.tenantId),
		eq(clients.active, true),
		...(input.name ? [ilike(clients.name, `%${input.name}%`)] : []),
		...(input.document ? [eq(clients.document, input.document)] : []),
	]

	const where = and(...conditions)

	const [rows, [{ value: total }]] = await Promise.all([
		db.select().from(clients).where(where).orderBy(clients.createdAt).limit(limit).offset(offset),
		db.select({ value: count() }).from(clients).where(where),
	])

	return { data: rows as ClientProps[], total: Number(total), page, limit }
}

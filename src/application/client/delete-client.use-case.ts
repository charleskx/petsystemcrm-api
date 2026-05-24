import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { clients } from "../../infra/database/drizzle/schema"
import { ClientNotFoundError } from "./get-client.use-case"

export async function deleteClient(id: string, tenantId: string): Promise<void> {
	const [existing] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId), eq(clients.active, true)))
		.limit(1)

	if (!existing) {
		throw new ClientNotFoundError()
	}

	await db
		.update(clients)
		.set({ active: false })
		.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
}
